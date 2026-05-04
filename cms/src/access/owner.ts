/**
 * Owner-based access control + audit fields.
 *
 * Mỗi business collection thêm field group `owner: { userId, orgId }`:
 *   - userId: Payload user đã tạo bản ghi (auto-set lúc create)
 *   - orgId : tổ chức (text) — hiện chỉ có 1 default "skillbot-default",
 *             chuẩn bị structure cho multi-org sau này
 *
 * Ai thấy gì (read access):
 *   - admin, manager, accountant : thấy hết trong cùng org
 *   - sales/planner/qc/storage   : chỉ thấy bản ghi mình tạo + các field
 *                                   ownership tự nhiên (salesperson,
 *                                   assignedTo, inspector, ...)
 *
 * Update tương tự read nhưng add admin/manager guard cho mức cao.
 */
import type {
  Access,
  CollectionBeforeChangeHook,
  Field,
  Where,
} from "payload";

export const DEFAULT_ORG_ID = "skillbot-default";

/** Roles "see-all-in-org" — admin oversight + finance reconciliation. */
export const SEE_ALL_ROLES = ["admin", "manager", "accountant"] as const;
export type SeeAllRole = (typeof SEE_ALL_ROLES)[number];

/** Field group dùng chung — spread vào fields[] của collection. */
export const ownerField: Field = {
  name: "owner",
  type: "group",
  label: "Owner (auto)",
  admin: {
    position: "sidebar",
    description: "Ai tạo + thuộc tổ chức nào — auto-set khi create.",
  },
  fields: [
    {
      name: "userId",
      label: "Người tạo",
      type: "relationship",
      relationTo: "users",
      admin: { readOnly: true },
    },
    {
      name: "orgId",
      label: "Tổ chức",
      type: "text",
      defaultValue: DEFAULT_ORG_ID,
      admin: { readOnly: true },
    },
  ],
};

/**
 * Hook beforeChange: tự gán `owner.userId` từ req.user khi create.
 * Không ghi đè nếu đã có giá trị (vd: import bulk có sẵn owner).
 */
export const setOwnerOnCreate: CollectionBeforeChangeHook = ({
  data,
  operation,
  req,
}) => {
  if (operation !== "create") return data;
  const owner = (data.owner as { userId?: string; orgId?: string } | undefined) ?? {};
  if (!owner.userId && req.user) {
    owner.userId = String(req.user.id);
  }
  if (!owner.orgId) {
    owner.orgId = DEFAULT_ORG_ID;
  }
  data.owner = owner;
  return data;
};

/**
 * Read access factory — owner-scoped.
 *  - admin/manager/accountant → toàn bộ
 *  - role khác → owner.userId === self HOẶC field trong `alsoOwnedVia`
 *
 * `alsoOwnedVia` cho các field relationship-to-users tự nhiên đại diện
 * "tôi sở hữu cái này": salesperson, assignedTo, inspector, recipients...
 */
export function readByOwnerScoped(opts: {
  alsoOwnedVia?: string[];
  /** Roles được nhìn hết ngoài SEE_ALL_ROLES. Vd planner có thể thấy hết
   *  Allowances vì điều phối toàn cơ sở. */
  alwaysSeen?: string[];
} = {}): Access {
  return ({ req: { user } }) => {
    if (!user) return false;
    const role = user.role ?? "";
    const seers = new Set<string>([...SEE_ALL_ROLES, ...(opts.alwaysSeen ?? [])]);
    if (seers.has(role)) return true;

    const conds: Where[] = [
      { "owner.userId": { equals: String(user.id) } },
    ];
    for (const f of opts.alsoOwnedVia ?? []) {
      conds.push({ [f]: { equals: String(user.id) } });
    }
    return { or: conds };
  };
}

/**
 * Read access — anyone in same org thấy hết (production data dùng chung
 * như Fabrics, Inventory, Allowances, Suppliers).
 * Hiện tại chỉ 1 org default → return true.
 */
export const readSameOrg: Access = ({ req: { user } }) => !!user;

/**
 * Update access factory — kết hợp role check + ownership.
 *  - admin/manager : luôn được
 *  - role được phép create (creators) : update nếu mình là owner hoặc
 *    thuộc `alsoOwnedVia`
 */
export function updateByOwnerScoped(opts: {
  creators: string[];
  alsoOwnedVia?: string[];
  /** Update không cần check ownership — vd accountant update tài chính
   *  của bất kỳ đơn nào. */
  alwaysCanUpdate?: string[];
}): Access {
  return ({ req: { user } }) => {
    if (!user) return false;
    const role = user.role ?? "";
    if (["admin", "manager"].includes(role)) return true;
    if ((opts.alwaysCanUpdate ?? []).includes(role)) return true;
    if (!opts.creators.includes(role)) return false;

    const conds: Where[] = [
      { "owner.userId": { equals: String(user.id) } },
    ];
    for (const f of opts.alsoOwnedVia ?? []) {
      conds.push({ [f]: { equals: String(user.id) } });
    }
    return { or: conds };
  };
}
