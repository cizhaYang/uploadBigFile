import { useRef, useState } from "react";
import styles from "./index.scss";
import SparkMD5 from "spark-md5";
import request from "../../utils/request";

/** 文件16进制前4位对应的map */
const fileMimeMap: any = {
  FFD8FFE0: "jpeg",
  FFD8FFE1: "jpg",
  "89504E47": "png",
  "47494638": "gif",
};

/** 获取文件的类型 */
const getFileMimeType = (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = (event: any) => {
      try {
        // 转换成正常数组然后取文件前4位
        let buffer = new Uint8Array(event.target.result).slice(0, 4);
        const result: any[] = [];
        buffer.forEach((item: any) => {
          const str = item.toString(16).padStart(2, "0").toUpperCase();
          result.push(str);
        });
        resolve(result.join(""));
      } catch (e) {
        reject(e);
      }
    };
  });
};

/** 获取文件的hash */
const formatFileWithMd5 = (file: File) => {
  return new Promise<{ buffer: ArrayBuffer; hash: string; suffix: string }>(
    (resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = (e: any) => {
        try {
          const buffer = e.target.result;
          const spark = new SparkMD5.ArrayBuffer();
          spark.append(buffer);
          const hash = spark.end();
          const suffix = file.name.split(".")[1];
          resolve({
            buffer,
            hash,
            suffix,
          });
        } catch (e) {
          reject(e);
        }
      };
      fileReader.onerror = function (e) {
        reject(e);
      };
    }
  );
};

export default function uploadFile() {
  let inputFile: any = null;
  const maxCount = 50;
  const [fileInfo, setFile] = useState<File>();
  const hashRef = useRef("");
  const chunksRef = useRef(0);

  const complate = async (index: number) => {
    if (index < chunksRef.current - 1) return;
    // 合并切片
    const result = await request({
      url: "/upload_merge",
      method: "POST",
      data: {
        hash: hashRef.current,
        count: chunksRef.current,
      },
    });
    console.log("result-----", result);
  };

  /** 获取文件的回调 */
  const onChangeFile = async (e: any) => {
    const fileInfo: File = e.target.files[0];

    // 校验文件类型
    // const fileMime = (await getFileMimeType(fileInfo)) as string;
    // console.log("fileMime---", fileMime, fileMimeMap[fileMime]);
    // if (!fileMimeMap[fileMime]) {
    //   alert('上传文件的类型不正确');
    //   return;
    // }

    const { buffer, hash, suffix } = await formatFileWithMd5(fileInfo);
    console.log("buffer--", buffer, hash, suffix);
    hashRef.current = hash;
    // 固定数量 | 固定大小
    let maxSize = 1024 * 200; // 固定大小200kb
    let index = 0;
    let chunkCount = Math.ceil(fileInfo.size / maxSize); // 能切割的数量
    const chunks = [];
    // 如果切割的数量大于设置的最高值（50），按50份分割
    if (chunkCount > maxCount) {
      maxSize = fileInfo.size / maxCount;
      chunkCount = maxCount;
    }
    chunksRef.current = chunkCount;
    // 文件大于100M，切片
    while (index < chunkCount) {
      const sliceChunk = fileInfo.slice(index * maxSize, maxSize * (index + 1));
      chunks.push({
        file: sliceChunk,
        filename: `${hash}_${index}.${suffix}`,
      });
      index = index + 1;
    }
    // 上传切片
    chunks.forEach((ck, i) => {
      const fm = new FormData();
      fm.append("file", ck.file);
      fm.append("filename", ck.filename);
      request({
        url: "/upload_chunk",
        method: "POST",
        data: fm,
      }).then(data => {
        complate(i);
      });
    });
    setFile(fileInfo);
    // inputFile.value = "";
  };

  const onSelectFile = () => {
    inputFile.click();
  };

  return (
    <div className={styles.home}>
      <h2>大文件上传</h2>
      <input
        type="file"
        onChange={onChangeFile}
        style={{ display: "none" }}
        ref={input => {
          inputFile = input;
        }}
      />
      <div className={styles.upload} onClick={onSelectFile}>
        <div>{fileInfo?.name || "upload file"}</div>
      </div>
    </div>
  );
}
