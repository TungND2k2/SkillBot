// import "dotenv/config";
// import { MongoClient } from "mongodb";
// const c = new MongoClient(process.env.DATABASE_URL);
// await c.connect();
// const db = c.db();
// for (const col of ["tenants","tenant_users","conversation_sessions","business_rules"]) {
//   const d = await db.collection(col).findOne({});
//   if (d) console.log(col + ": _id=" + d._id + " (type=" + typeof d._id + ") id=" + d.id + " tenantId=" + d.tenantId);
// }
// await c.close();
