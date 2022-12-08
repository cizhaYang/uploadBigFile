export default {
  routes: [
    {
      path: "/",
      component: "@/layouts",
      routes: [
        { path: "/uploadFile", redirect: "/" },
        { path: "/", component: "uploadFile" },
      ],
    },
  ],
};
