export function getValidString(str: unknown): string
{
  if (!str || typeof str !== "string")
  {
    return "";
  }
  let resultStr = "";
  for (let i = 0; i < str.length; i++)
  {
    if (str[i] === " ")
    {
      resultStr = `${resultStr} `;
    }
    else if (str[i].toLowerCase() !== str[i].toUpperCase() || !Number.isNaN(Number(str[i])))
    {
      resultStr = `${resultStr}${str[i]}`;
    }
  }
  return resultStr;
}
