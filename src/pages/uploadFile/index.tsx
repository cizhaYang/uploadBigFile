import { useEffect, useRef, useState } from "react";
import styles from "./index.scss";
import SparkMD5 from "spark-md5";
import { getAlreadyFiles, mergeChunk, uploadChunk } from "@/api";

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

export default function uploadFile() {
  let inputFile: any = null;
  const maxCount = 550;
  const [fileInfo, setFile] = useState<File>();
  const hashRef = useRef("");
  const chunksRef = useRef(0);
  const alReadyListRef = useRef<string[]>([]);
  const workerRef = useRef<Worker>();
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setInterval(() => {
      setCount(c => c + 1);
    }, 300);
  }, []);

  /** 子线程计算hash */
  const calculateFileHashWithWorker = (file: File) => {
    return new Promise((resolve, reject) => {
      try {
        workerRef.current = new Worker("hash.js");
        workerRef.current.postMessage(file);
        workerRef.current.onmessage = e => {
          resolve(e.data);
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  /** 获取文件的hash */
  const calculateFileHash = (file: File) => {
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

  const complate = async (index: number) => {
    // 处理进度条
    const width = ((index + 1) / chunksRef.current) * 100;
    setProgress(width);
    if (index < chunksRef.current - 1) return;

    // 合并切片
    const result = await mergeChunk({
      hash: hashRef.current,
      count: chunksRef.current,
    });
    if (result.code === 0) {
      setTimeout(() => {
        alert("大文件上传成功!");
      }, 500);
    }
    setProgress(100);
  };

  /** 创建切片 */
  const createFileChunks = (fileInfo: File, hash: string, suffix: string) => {
    // 固定数量 | 固定大小
    let maxSize = 1024 * 200; // 固定大小200kb
    let index = 0;
    let chunkCount = Math.ceil(fileInfo.size / maxSize); // 能切割的数量
    const chunks = [];
    // 如果切割的数量大于设置的最高值，按最大值分割
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
    return chunks;
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

    console.time("hash计算时间");
    const { hash, suffix } = (await calculateFileHashWithWorker(
      fileInfo
    )) as any;
    console.timeEnd("hash计算时间");
    // const { hash, suffix } = await calculateFileHash(fileInfo); // 不用webworker 会阻塞主线程

    hashRef.current = hash;

    // 获取已经上传过的切片
    const data = await getAlreadyFiles(hash);
    if (data?.code === 0) {
      alReadyListRef.current = data.fileList || [];
    }

    const chunks = createFileChunks(fileInfo, hash, suffix);

    // 上传切片
    chunks.forEach(async (ck, i) => {
      const fm = new FormData();
      fm.append("file", ck.file);
      fm.append("filename", ck.filename);
      // 判断切片是否存在
      if (alReadyListRef.current.includes(ck.filename)) {
        complate(i);
        return;
      }
      const data = await uploadChunk(fm);
      if (data.code === 0) {
        complate(i);
      }
    });
    setFile(fileInfo);
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
      <div className={styles.bar}>
        <div className={styles.progress} style={{ width: `${progress}%` }} />
      </div>
      <div style={{ marginTop: 100, padding: "10px 60px" }}>{count}</div>
    </div>
  );
}
