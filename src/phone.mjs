import {parsePhoneNumberWithError} from 'libphonenumber-js/core';
import metadata from './phone-metadata.json' with {type:'json'};
export function formatPhoneLine(original) {
  const text=original.trim();
  if(!text)return {original,output:original,status:'blank',reason:''};
  const normalized=text.normalize('NFKC').replace(/[‐‑‒–—―−ー]/g,'-');
  // Do not silently extract digits from names, extensions, or unrelated text.
  if(!/^[+\d\s()\-]+$/.test(normalized)) return {original,output:original,status:'invalid',reason:'数字・空白・括弧・ハイフン以外の文字があります'};
  // International notation may include an explicitly optional domestic trunk zero.
  const phoneText=normalized.replace(/^(\+81[\s-]*)\(0\)[\s-]*/, '$1');
  const digits=phoneText.replace(/[\s()\-]/g,'');
  if(!/^(0\d{9,10}|\+81\d{9,10})$/.test(digits))return {original,output:original,status:'review',reason:'日本の10〜11桁の番号、または +81 形式を確認してください'};
  try {
    const phone=parsePhoneNumberWithError(phoneText,{defaultCountry:'JP',extract:false},metadata);
    if(phone.country!=='JP'||!phone.isValid())return {original,output:original,status:'review',reason:'番号の桁数・市外局番を確認してください'};
    return {original,output:phone.formatNational(),status:'ok',reason:'番号形式を整形しました（実在・接続の確認は行いません）'};
  } catch {return {original,output:original,status:'review',reason:'番号の形式を確認してください'};}
}
export function formatPhoneText(text){return text.split(/\r\n|\n|\r/).map(formatPhoneLine);}
