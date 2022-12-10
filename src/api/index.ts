import request from "@/utils/request";

interface DataRes {
  code: number;
  codeText: string;
  fileList?: string[];
}

interface ChunkData {
  hash: string;
  count: number;
}

/**
 * 上传切片
 * @param data
 * @returns
 */
export const uploadChunk = (data: FormData) => {
  return request<any, DataRes>({
    url: "/upload_chunk",
    method: "POST",
    data,
  });
};

/**
 * 合并切片
 * @param data
 * @returns
 */
export const mergeChunk = (data: ChunkData) => {
  return request<any, DataRes>({
    url: "/upload_merge",
    method: "POST",
    data,
  });
};

/**
 * 获取已经上传过的切片
 * @param hash
 * @returns
 */
export const getAlreadyFiles = (hash: string) => {
  return request<any, DataRes>({
    url: "/upload_already",
    method: "GET",
    params: {
      hash,
    },
  });
};
