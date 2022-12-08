import { defineConfig } from "umi";
import configRoutes from "./config.routes";

export default defineConfig({
  base: "/",
  routes: configRoutes.routes,
});
