import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "list_users": {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers({
          perPage: 100,
        });
        if (error) throw error;

        // Get profiles and permissions
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id, email, full_name, role, is_approved, last_sign_in_at, created_at");

        const { data: allRoles } = await adminClient
          .from("user_roles")
          .select("user_id, role");

        const { data: allPermissions } = await adminClient
          .from("user_permissions")
          .select("user_id, permission");

        const enrichedUsers = users.map((u) => {
          const profile = profiles?.find((p) => p.id === u.id);
          const roles = allRoles?.filter((r) => r.user_id === u.id).map((r) => r.role) || [];
          const permissions = allPermissions?.filter((p) => p.user_id === u.id).map((p) => p.permission) || [];

          return {
            id: u.id,
            email: u.email,
            full_name: profile?.full_name || u.user_metadata?.full_name || null,
            is_approved: profile?.is_approved || false,
            roles,
            permissions,
            last_sign_in_at: u.last_sign_in_at || profile?.last_sign_in_at,
            created_at: u.created_at,
          };
        });

        return new Response(JSON.stringify({ users: enrichedUsers }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_user": {
        const { email, password, full_name, role } = params;
        if (!email || !password) {
          return new Response(JSON.stringify({ error: "Email and password required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (String(password).length < 6) {
          return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedName = String(full_name || normalizedEmail).trim();
        const normalizedRole = ["user", "admin", "super_admin"].includes(String(role)) ? String(role) : "user";

        let { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: { full_name: normalizedName },
        });

        let wasCreated = !createError;
        if (createError) {
          // Treat Create User as an idempotent admin operation. A person may
          // already have signed up and be waiting for approval; in that case,
          // update and approve the existing account instead of failing.
          const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          if (listError) throw listError;
          const existing = existingUsers.users.find(
            (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
          );
          if (!existing) throw createError;

          const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
            existing.id,
            {
              password,
              email_confirm: true,
              user_metadata: { ...existing.user_metadata, full_name: normalizedName },
            },
          );
          if (updateError) throw updateError;
          newUser = updatedUser;
          wasCreated = false;
        }

        if (!newUser.user) throw new Error("User account could not be created or updated");

        // Auto-approve the created user
        const { error: profileError } = await adminClient.from("profiles").upsert({
          id: newUser.user.id,
          email: normalizedEmail,
          is_approved: true,
          approved_by: caller.id,
          approved_at: new Date().toISOString(),
          full_name: normalizedName,
          role: normalizedRole,
        }, { onConflict: "id" });
        if (profileError) throw profileError;

        // Apply the selected role idempotently.
        const { error: clearRoleError } = await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", newUser.user.id);
        if (clearRoleError) throw clearRoleError;
        if (normalizedRole === "admin" || normalizedRole === "super_admin") {
          const { error: roleError } = await adminClient.from("user_roles").insert({
            user_id: newUser.user.id,
            role: normalizedRole,
          });
          if (roleError) throw roleError;
        }

        return new Response(JSON.stringify({ success: true, created: wasCreated, user: newUser.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "approve_user": {
        const { user_id } = params;
        if (!user_id) {
          return new Response(JSON.stringify({ error: "user_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updateError } = await adminClient.from("profiles").update({
          is_approved: true,
          approved_by: caller.id,
          approved_at: new Date().toISOString(),
        }).eq("id", user_id);
        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "revoke_user": {
        const { user_id } = params;
        if (!user_id) {
          return new Response(JSON.stringify({ error: "user_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updateError } = await adminClient.from("profiles").update({
          is_approved: false,
        }).eq("id", user_id);
        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "change_password": {
        const { user_id, new_password } = params;
        if (!user_id || !new_password) {
          return new Response(JSON.stringify({ error: "user_id and new_password required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
          password: new_password,
        });

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "force_logout": {
        const { user_id } = params;
        if (!user_id) {
          return new Response(JSON.stringify({ error: "user_id required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Sign out all sessions for this user
        const { error: logoutError } = await adminClient.auth.admin.signOut(user_id, "global");
        if (logoutError) throw logoutError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_role": {
        const { user_id, new_role } = params;
        if (!user_id || !new_role) {
          return new Response(JSON.stringify({ error: "user_id and new_role required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Remove existing roles
        await adminClient.from("user_roles").delete().eq("user_id", user_id);

        // Add new role
        if (new_role !== "user") {
          await adminClient.from("user_roles").insert({
            user_id,
            role: new_role,
          });
        }

        // Update profile role field
        await adminClient.from("profiles").update({ role: new_role }).eq("id", user_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_permissions": {
        const { user_id, permissions } = params;
        if (!user_id || !Array.isArray(permissions)) {
          return new Response(JSON.stringify({ error: "user_id and permissions array required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Remove all existing permissions for user
        await adminClient.from("user_permissions").delete().eq("user_id", user_id);

        // Insert new permissions
        if (permissions.length > 0) {
          await adminClient.from("user_permissions").insert(
            permissions.map((p: string) => ({
              user_id,
              permission: p,
              granted_by: caller.id,
            }))
          );
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Admin user management error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
