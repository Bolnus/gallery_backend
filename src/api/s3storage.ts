import { Readable } from "stream";
import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { getEnvGalleryName, getEnvS3BaseUrl, getEnvS3Credentials } from "../env.js";
import { timeLog, timeWarn } from "../log.js";
import { readLocalFile, streamToFile } from "../fileSystem.js";

let s3Client: S3Client;

export function initS3Client(): void {
  s3Client = new S3Client({
    region: "us-east-1",
    // forcePathStyle: true,
    credentials: getEnvS3Credentials(),
    endpoint: getEnvS3BaseUrl()
    // endpoint: {
    //   protocol: "https",
    //   hostname: "s3.regru.cloud",
    //   path: "/"
    // },
    // bucketEndpoint: false
  });
}

function encodeS3Path(s3Path: string): string {
  return encodeURIComponent(s3Path).replace(/%2F/g, "/");
}

function encodeS3CopySource(key: string): string {
  return encodeS3Path(encodeS3Path(key)); // .replace(/%2F/g, "/")
}

export async function lsBucketsS3(): Promise<number> {
  try {
    const putCommand = new ListBucketsCommand();

    const res = await s3Client.send(putCommand);
    timeLog(JSON.stringify(res.Buckets, null, 2));
    return 0;
  } catch (localErr) {
    timeWarn("bucketS3ls error");
    timeLog(localErr);
    return 1;
  }
}

export async function putFileToS3(file: Buffer, s3Path: string, contentType: string): Promise<number> {
  try {
    const putCommand = new PutObjectCommand({
      Bucket: getEnvGalleryName(),
      Key: encodeS3Path(s3Path),
      Body: file,
      ContentType: contentType
    });

    await s3Client.send(putCommand);
    return 0;
  } catch (localErr) {
    timeWarn("putFileToS3 error");
    timeLog(localErr);
    return 1;
  }
}

export async function putLocalFileToS3(localPath: string, s3Path: string, contentType: string): Promise<number> {
  try {
    const fileContent = await readLocalFile(localPath);
    if (fileContent === null) {
      return 2;
    }
    await s3Client.send(
      new PutObjectCommand({
        Bucket: getEnvGalleryName(),
        Key: encodeS3Path(s3Path),
        Body: fileContent,
        ContentType: contentType
      })
    );
    return 0;
  } catch (localErr) {
    return 1;
  }
}

export async function removeFilesGroupFromS3(s3PathsList: string[], quiet?: boolean): Promise<number> {
  try {
    for (let i = 0; i < s3PathsList.length; i += 1000) {
      const batch = s3PathsList.slice(i, i + 1000);

      const response = await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: getEnvGalleryName(),
          Delete: {
            Objects: batch.map((key) => ({ Key: encodeS3Path(key) })),
            Quiet: quiet
          }
        })
      );

      if (response.Errors) {
        for (const delError of response.Errors) {
          timeWarn(`Failed to delete ${delError.Key}: ${delError.Code}`);
        }
      }
    }
    return 0;
  } catch (localErr) {
    timeWarn("removeFilesGroupFromS3");
    console.log(localErr);
    return 1;
  }
}

export async function getS3FileStream(s3Path: string): Promise<GetObjectCommandOutput> {
  return s3Client.send(
    new GetObjectCommand({
      Bucket: getEnvGalleryName(),
      Key: encodeS3Path(s3Path)
    })
  );
}

export async function saveS3FileLocally(s3Path: string, localFilePath: string): Promise<number> {
  try {
    const fileStream = await getS3FileStream(s3Path);
    if (fileStream.Body instanceof Readable) {
      return streamToFile(fileStream.Body, localFilePath);
    }
    throw new Error("saveS3FileLocally error");
  } catch (localErr) {
    timeWarn("saveS3FileLocally error");
    return 1;
  }
}

export async function removeFileFromS3(s3Path: string): Promise<number> {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: getEnvGalleryName(),
      Key: encodeS3Path(s3Path)
    });
    await s3Client.send(deleteCommand);
    return 0;
  } catch (localErr) {
    timeWarn("removeFileFromS3 error");
    timeLog(localErr);
    return 1;
  }
}

export async function fileExistsInS3(s3Path: string): Promise<boolean> {
  try {
    const headCommand = new HeadObjectCommand({
      Bucket: getEnvGalleryName(),
      Key: encodeS3Path(s3Path)
    });
    await s3Client.send(headCommand);
    return true;
  } catch (localErr) {
    if ((localErr as Error)?.name !== "NotFound") {
      timeWarn("Unknown fileExistsInS3 error");
      timeLog(localErr);
    }
    return false;
  }
}

export async function copyS3File(oldPath: string, newPath: string): Promise<number> {
  const bucketName = getEnvGalleryName();
  const copySource = encodeS3CopySource(oldPath);
  const destination = encodeS3Path(newPath);
  try {
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${copySource}`,
        Key: destination,
        MetadataDirective: "COPY"
      })
    );
    return 0;
  } catch (localErr) {
    timeWarn(`copyS3File error ${copySource} -> ${destination}`);
    timeLog(localErr);
    return 1;
  }
}

export async function moveS3File(oldPath: string, newPath: string): Promise<number> {
  try {
    const bucketName = getEnvGalleryName();
    const copyRc = await copyS3File(oldPath, newPath);
    if (copyRc) {
      return copyRc;
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: encodeS3Path(oldPath)
      })
    );

    return 0;
  } catch (localErr) {
    timeWarn("moveS3File error");
    timeLog(localErr);
    return 2;
  }
}

export async function listObjectsInS3Dir(s3Directory: string): Promise<string[]> {
  const allObjects: string[] = [];
  let continuationToken: string | undefined;
  let isTruncated = false;

  try {
    do {
      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: getEnvGalleryName(),
          Prefix: encodeS3Path(s3Directory),
          ContinuationToken: continuationToken
        })
      );

      if (response.Contents) {
        for (const fileObj of response.Contents) {
          if (fileObj.Key) {
            allObjects.push(decodeURIComponent(fileObj.Key));
          }
        }
      }

      // Handle pagination
      isTruncated = response.IsTruncated || false;
      continuationToken = response.NextContinuationToken;
    } while (isTruncated);

    return allObjects;
  } catch (localErr) {
    timeWarn(`Error listing S3 objects in ${s3Directory}`);
    return [];
  }
}

export async function removeS3Dir(s3Directory: string): Promise<number> {
  const objectsInDir = await listObjectsInS3Dir(s3Directory);
  return removeFilesGroupFromS3(objectsInDir, true);
}

export async function copyS3Dir(s3SourceDir: string, s3TargetDir: string): Promise<number> {
  const objectsInDir = await listObjectsInS3Dir(s3SourceDir);
  for (const objectPath of objectsInDir) {
    await copyS3File(objectPath, objectPath.replace(s3SourceDir, s3TargetDir));
  }
  return 0;
}
