import "dotenv/config";
import * as db from "../server/db";
import { appRouter } from "../server/routers";

async function main() {
  console.log("Testing appRouter.admin.updateUserRole...");
  
  // 1. Get an admin user (ID 1 or ID 54)
  const adminUser = await db.getUserById(1);
  console.log("Admin user:", adminUser?.name, adminUser?.email, adminUser?.role);

  // 2. Call listUsers
  const caller = appRouter.createCaller({
    req: {} as any,
    res: {} as any,
    user: adminUser as any,
    attendant: null,
  });

  const usersList = await caller.admin.listUsers();
  console.log("Users count:", usersList.length);

  // 3. Try to update user 2 from user to admin
  console.log("Updating user 2 to 'admin'...");
  const res1 = await caller.admin.updateUserRole({ userId: 2, role: "admin" });
  console.log("Result 1:", res1);
  const u2After1 = await db.getUserById(2);
  console.log("User 2 role now:", u2After1?.role);

  // 4. Try to update user 2 back to 'user'
  console.log("Updating user 2 to 'user'...");
  const res2 = await caller.admin.updateUserRole({ userId: 2, role: "user" });
  console.log("Result 2:", res2);
  const u2After2 = await db.getUserById(2);
  console.log("User 2 role now:", u2After2?.role);

  // 5. Try with Espaço Physio caller (ID 54)
  const physioUser = await db.getUserById(54);
  console.log("Physio user:", physioUser?.name, physioUser?.email, physioUser?.role);
  const physioCaller = appRouter.createCaller({
    req: {} as any,
    res: {} as any,
    user: physioUser as any,
    attendant: null,
  });

  const res3 = await physioCaller.admin.updateUserRole({ userId: 2, role: "admin" });
  console.log("Result 3 with Physio caller:", res3);
  await physioCaller.admin.updateUserRole({ userId: 2, role: "user" });

  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  process.exit(0);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
