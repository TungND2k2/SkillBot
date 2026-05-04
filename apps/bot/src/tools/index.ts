/**
 * Single registry of all tools the AI can call. Add new entities by
 * importing their CRUD bundle here; add custom logic by writing an
 * additional file and pushing into this array.
 */
import { orderTools } from "./orders.tools.js";
import { customerTools } from "./customers.tools.js";
import { fabricTools } from "./fabrics.tools.js";
import { supplierTools } from "./suppliers.tools.js";
import { inventoryTools } from "./inventory.tools.js";
import { qcLogTools } from "./qcLogs.tools.js";
import { allowanceTools } from "./allowances.tools.js";
import { workflowStageTools } from "./workflow-stages.tools.js";
import { reminderTools } from "./reminders.tools.js";

import { advanceOrderStatus } from "./orders.workflow.js";
import { findLowStock, weeklyReport } from "./inventory.queries.js";
import { formTools } from "./forms.tools.js";
import { orderStatusSummary } from "./orders.summary.js";

export const allTools = [
  // CRUD generic — auto-generated từ factory.
  ...orderTools,            // 5: list/get/create/update/delete _orders
  ...customerTools,         // 5
  ...fabricTools,           // 4: no delete
  ...supplierTools,         // 5
  ...inventoryTools,        // 4: no delete
  ...qcLogTools,            // 4: no delete
  ...allowanceTools,        // 5
  ...workflowStageTools,    // 4: no delete
  ...reminderTools,         // 5: list/get/create/update/delete _reminders

  // Form builder integration.
  ...formTools,             // 4: list_forms, get_form, submit_form, list_submissions

  // Domain-specific.
  advanceOrderStatus,
  findLowStock,
  weeklyReport,
  orderStatusSummary,
];
