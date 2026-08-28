export type MobileHeaderMeta = {
  title: string;
  backTo?: string;
  backLabel?: string;
};

type RouteRule = {
  pattern: RegExp;
  resolve: (match: RegExpMatchArray) => MobileHeaderMeta;
};

const rules: RouteRule[] = [
  {
    pattern: /^\/sales\/new$/,
    resolve: () => ({ title: "New invoice", backTo: "/sales", backLabel: "Back to Sales" }),
  },
  {
    pattern: /^\/sales\/([^/]+)\/edit$/,
    resolve: (m) => ({
      title: "Edit invoice",
      backTo: `/sales/${m[1]}`,
      backLabel: "Back to invoice",
    }),
  },
  {
    pattern: /^\/sales\/([^/]+)$/,
    resolve: () => ({ title: "Invoice", backTo: "/sales", backLabel: "Back to Sales" }),
  },
  {
    pattern: /^\/purchase\/new$/,
    resolve: () => ({ title: "New bill", backTo: "/purchase", backLabel: "Back to Purchase" }),
  },
  {
    pattern: /^\/purchase\/([^/]+)\/edit$/,
    resolve: (m) => ({
      title: "Edit bill",
      backTo: `/purchase/${m[1]}`,
      backLabel: "Back to bill",
    }),
  },
  {
    pattern: /^\/purchase\/([^/]+)$/,
    resolve: () => ({ title: "Purchase bill", backTo: "/purchase", backLabel: "Back to Purchase" }),
  },
  {
    pattern: /^\/raw-material\/new$/,
    resolve: () => ({
      title: "New raw material bill",
      backTo: "/raw-material",
      backLabel: "Back to Raw material",
    }),
  },
  {
    pattern: /^\/raw-material\/([^/]+)\/edit$/,
    resolve: (m) => ({
      title: "Edit bill",
      backTo: `/raw-material/${m[1]}`,
      backLabel: "Back to bill",
    }),
  },
  {
    pattern: /^\/raw-material\/([^/]+)$/,
    resolve: () => ({
      title: "Raw material bill",
      backTo: "/raw-material",
      backLabel: "Back to Raw material",
    }),
  },
  {
    pattern: /^\/sales$/,
    resolve: () => ({ title: "Sales", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/purchase$/,
    resolve: () => ({ title: "Purchase", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/inventory$/,
    resolve: () => ({ title: "Inventory", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/raw-material$/,
    resolve: () => ({ title: "Raw material", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/cash$/,
    resolve: () => ({ title: "Cash", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/bank$/,
    resolve: () => ({ title: "Bank", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/gst$/,
    resolve: () => ({ title: "GST", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/customers$/,
    resolve: () => ({ title: "Customers", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/vendors$/,
    resolve: () => ({ title: "Vendors", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/products$/,
    resolve: () => ({ title: "Products", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/reports$/,
    resolve: () => ({ title: "Reports", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/users$/,
    resolve: () => ({ title: "Users", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/recycle-bin$/,
    resolve: () => ({ title: "Recycle bin", backTo: "/", backLabel: "Back to Dashboard" }),
  },
  {
    pattern: /^\/$/,
    resolve: () => ({ title: "PNS Enterprises" }),
  },
];

export function getMobileHeaderMeta(pathname: string): MobileHeaderMeta {
  for (const rule of rules) {
    const match = pathname.match(rule.pattern);
    if (match) return rule.resolve(match);
  }
  return { title: "PNS ERP", backTo: "/" };
}
