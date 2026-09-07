import { combineReducers } from "@reduxjs/toolkit";
import customersReducer from "./slices/customersSlice";
import productsReducer from "./slices/productsSlice";
import vendorsReducer from "./slices/vendorsSlice";
import salesReducer from "./slices/salesSlice";
import purchaseReducer from "./slices/purchaseSlice";
import inventoryReducer from "./slices/inventorySlice";
import dashboardReducer from "./slices/dashboardSlice";
import paymentsReducer from "./slices/paymentsSlice";
import rawMaterialReducer from "./slices/rawMaterialSlice";
import gstReducer from "./slices/gstSlice";
import ledgerReducer from "./slices/ledgerSlice";
import profitLossReducer from "./slices/profitLossSlice";
import investmentsReducer from "./slices/investmentsSlice";
import reportsReducer from "./slices/reportsSlice";
import recycleBinReducer from "./slices/recycleBinSlice";
import usersReducer from "./slices/usersSlice";

export const rootReducer = combineReducers({
  customers: customersReducer,
  products: productsReducer,
  vendors: vendorsReducer,
  sales: salesReducer,
  purchase: purchaseReducer,
  inventory: inventoryReducer,
  dashboard: dashboardReducer,
  payments: paymentsReducer,
  rawMaterial: rawMaterialReducer,
  gst: gstReducer,
  ledger: ledgerReducer,
  profitLoss: profitLossReducer,
  investments: investmentsReducer,
  reports: reportsReducer,
  recycleBin: recycleBinReducer,
  users: usersReducer,
});
