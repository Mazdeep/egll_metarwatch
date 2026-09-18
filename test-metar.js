const metar = "METAR EGLL 172350Z AUTO 24009KT 9999 NCD 13/09 Q1012";
const windMatch = metar.match(/(\d{3}|VRB)(\d{2,3})(?:G\d{2,3})?(?:KT|MPS)/);
console.log("Wind:", windMatch ? [windMatch[1], windMatch[2]] : null);
const qnhMatch = metar.match(/Q(\d{4})/);
console.log("QNH:", qnhMatch ? qnhMatch[1] : null);
