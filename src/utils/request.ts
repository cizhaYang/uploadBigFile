import axios from "axios";
import Qs from "qs";

const instance = axios.create({
  baseURL: "http://127.0.0.1:3000",
});
instance.defaults.transformRequest = (data, headers) => {
  return data;
};

instance.interceptors.request.use(request => {
  if (request.url === "/upload_merge") {
    request.headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    request.data = Qs.stringify(request.data);
  }

  return request;
});

instance.interceptors.response.use(
  response => {
    return response.data;
  },
  reason => {
    return Promise.reject(reason);
  }
);

export default instance;
