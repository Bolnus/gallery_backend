export function getValidString(str: unknown): string {
  if (!str || typeof str !== "string") {
    return "";
  }
  let resultStr = "";
  for (let i = 0; i < str.length; i++) {
    if (str[i] === " ") {
      resultStr = `${resultStr} `;
    } else if (str[i] === "-") {
      resultStr = `${resultStr}-`;
    } else if (str[i] === ",") {
      resultStr = `${resultStr},`;
    } else if (str[i] === ".") {
      resultStr = `${resultStr}.`;
    } else if (str[i] === "'") {
      resultStr = `${resultStr}'`;
    } else if (str[i] === "&") {
      resultStr = `${resultStr}&`;
    } else if (str[i].toLowerCase() !== str[i].toUpperCase() || !Number.isNaN(Number(str[i]))) {
      resultStr = `${resultStr}${str[i]}`;
    }
  }
  return resultStr;
}

export function isValidStringPhrase(str: unknown): boolean {
  if (typeof str !== "string") {
    return false;
  }
  return new RegExp(/^[\p{L}\s0-9\-,\.&']*$/u).test(str);
}

export function isValidStringTag(str: unknown): boolean {
  if (typeof str !== "string") {
    return false;
  }
  return new RegExp(/^[\p{L}\s0-9]*$/u).test(str);
}
