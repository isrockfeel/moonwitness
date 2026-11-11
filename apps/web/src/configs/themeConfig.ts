export interface ThemeConfig {
  appName: string;
  appVersion: string;
  tagline: string;
  layout: "vertical" | "horizontal" | "collapsed";
  mode: "dark" | "light" | "semi-dark";
  skin: "default" | "bordered" | "riot-grunge";
  contentWidth: "full" | "boxed";
  appBar: {
    type: "fixed" | "static" | "hidden";
    blur: boolean;
  };
  footer: {
    type: "fixed" | "static" | "hidden";
  };
  routing: {
    defaultPath: string;
    authPath: string;
    paasPath: string;
    vpnPath: string;
  };
}

export const themeConfig: ThemeConfig = {
  appName: "MOONWITNESS",
  appVersion: "2.6-RIOT",
  tagline: "Empire of the light // Underground Signal",
  layout: "vertical",
  mode: "dark",
  skin: "riot-grunge",
  contentWidth: "full",
  appBar: {
    type: "fixed",
    blur: true,
  },
  footer: {
    type: "static",
  },
  routing: {
    defaultPath: "/mission-control",
    authPath: "/shadow",
    paasPath: "/paas",
    vpnPath: "/vpn",
  },
};

