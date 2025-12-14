import crypto from "crypto";

function processHashResult(
  err: Error | null,
  derivedKey: Buffer<ArrayBufferLike>,
  salt: string,
  resolve: (value: string) => void,
  reject: (reason?: unknown) => void
): void {
  if (err) {
    reject(err);
    return;
  }

  const hash = derivedKey.toString("hex");
  const result: string = `${salt}:${hash}`;
  resolve(result);
}

function initHashPromise(password: string, resolve: (value: string) => void, reject: (reason?: unknown) => void) {
  const salt = crypto.randomBytes(16).toString("hex");

  crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) =>
    processHashResult(err, derivedKey, salt, resolve, reject)
  );
}

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => initHashPromise(password, resolve, reject));
}

function hashMatchesWithOriginal(
  err: Error | null,
  derivedKey: Buffer<ArrayBufferLike>,
  originalHash: string,
  resolve: (value: boolean) => void,
  reject: (err: Error) => void
) {
  if (err) {
    reject(err);
    return;
  }

  const hash = derivedKey.toString("hex");
  resolve(hash === originalHash);
}

function initHashMatchPromise(
  password: string,
  storedHash: string,
  resolve: (value: boolean) => void,
  reject: (err: Error) => void
) {
  const [salt, originalHash] = storedHash.split(":");

  if (!salt || !originalHash) {
    reject(new Error('Invalid hash format. Expected "salt:hash"'));
    return;
  }

  crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) =>
    hashMatchesWithOriginal(err, derivedKey, originalHash, resolve, reject)
  );
}

export function passwordMatchesWithHash(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => initHashMatchPromise(password, storedHash, resolve, reject));
}
