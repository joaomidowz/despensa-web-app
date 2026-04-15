import packageJson from "../../package.json";

type FrontendPackageMeta = {
  version: string;
  appReleaseLabel?: string;
};

const packageMeta = packageJson as FrontendPackageMeta;

export const APP_RELEASE_LABEL =
  import.meta.env.VITE_APP_RELEASE_LABEL?.trim() || packageMeta.appReleaseLabel || packageMeta.version;
