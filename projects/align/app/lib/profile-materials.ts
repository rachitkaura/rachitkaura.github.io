export type MaterialKind='github'|'resume'|'coverLetter';
export type MaterialSelection=Record<MaterialKind,boolean>;
export type MaterialDocument={name:string;url?:string;key?:string;downloadUrl?:string};
export type SharedMaterials={githubUrl:string;resume:MaterialDocument|null;coverLetter:MaterialDocument|null};
export type ProfileMaterials=SharedMaterials&{include:MaterialSelection};
export const materialLabels={github:'GitHub',resume:'Résumé',coverLetter:'Cover letter'};
export const noMaterials:MaterialSelection={github:false,resume:false,coverLetter:false};
export const emptyMaterials=():ProfileMaterials=>({githubUrl:'',resume:null,coverLetter:null,include:{...noMaterials}});

function https(value:unknown,label:string){
 if(typeof value!=='string'||value.length>1000)throw Error('Enter a valid '+label+' link.');
 let url:URL;try{url=new URL(value.trim())}catch{throw Error('Use a full https:// link for '+label+'.')}
 if(url.protocol!=='https:'||url.username||url.password)throw Error('Use a full https:// link without sign-in credentials for '+label+'.');
 return url;
}
export function normalizeMaterials(value:any,ownerId:string):ProfileMaterials{
 if(value==null)return emptyMaterials();
 if(typeof value!=='object'||Array.isArray(value))throw Error('Choose valid profile materials.');
 const result=emptyMaterials();
 if(value.githubUrl){const url=https(value.githubUrl,'GitHub');if(!['github.com','www.github.com'].includes(url.hostname.toLowerCase())||url.port)throw Error('Use a github.com profile or repository link.');url.hostname='github.com';result.githubUrl=url.href;}
 for(const kind of ['resume','coverLetter'] as const){
  const doc=value[kind];if(!doc)continue;
  if(typeof doc!=='object'||typeof doc.name!=='string'||!doc.name.trim()||doc.name.length>180||/[\r\n\u0000]/.test(doc.name))throw Error('Give your '+materialLabels[kind].toLowerCase()+' a valid name.');
  if(Boolean(doc.url)===Boolean(doc.key))throw Error('Choose one link or uploaded file for each document.');
  if(doc.url)result[kind]={name:doc.name.trim(),url:https(doc.url,materialLabels[kind].toLowerCase()).href};
  else{if(typeof doc.key!=='string'||doc.key.length>700||!doc.key.startsWith(encodeURIComponent(ownerId)+'/')||!/(?:\.pdf|\.docx)$/i.test(doc.key))throw Error('Choose a PDF or DOCX uploaded to your own account.');result[kind]={name:doc.name.trim(),key:doc.key};}
 }
 const include=value.include||{};
 for(const kind of ['github','resume','coverLetter'] as const)result.include[kind]=include[kind]===true&&Boolean(kind==='github'?result.githubUrl:result[kind]);
 return result;
}
export function availableMaterials(materials?:Partial<SharedMaterials>|null):MaterialKind[]{return (['github','resume','coverLetter'] as const).filter(kind=>Boolean(kind==='github'?materials?.githubUrl:materials?.[kind]));}
export function defaultMaterialSelection(profile:any):MaterialSelection{const materials=profile?.materials;return Object.fromEntries((['github','resume','coverLetter'] as const).map(kind=>[kind,materials?.include?.[kind]===true&&availableMaterials(materials).includes(kind)])) as MaterialSelection;}
export function selectedMaterials(profile:any,selection:any):SharedMaterials|null{
 if(selection==null)return null;
 if(typeof selection!=='object'||Array.isArray(selection)||Object.values(selection).some(v=>typeof v!=='boolean'))throw Error('Choose which profile materials to include.');
 const source=profile.materials||emptyMaterials(),result:SharedMaterials={githubUrl:'',resume:null,coverLetter:null};
 for(const kind of ['github','resume','coverLetter'] as const){if(selection[kind]!==true)continue;if(!availableMaterials(source).includes(kind))throw Error('Your '+materialLabels[kind].toLowerCase()+' changed. Review your profile before swiping again.');if(kind==='github')result.githubUrl=source.githubUrl;else result[kind]=structuredClone(source[kind]);}
 return availableMaterials(result).length?result:null;
}
export function activeMaterialMatch(application:any){return Boolean((application.candidateInterest??application.candidate_interest)&&(application.employerInterest??application.employer_interest)&&!['closed','withdrawn'].includes(application.stage));}
export function materialPacketView(packet:SharedMaterials|null|undefined,applicationId:string):SharedMaterials|null{
 if(!packet||!availableMaterials(packet).length)return null;
 const result:SharedMaterials={githubUrl:packet.githubUrl||'',resume:null,coverLetter:null};
 for(const kind of ['resume','coverLetter'] as const){const doc=packet[kind];if(doc)result[kind]=doc.key?{name:doc.name,downloadUrl:'/api/resume?applicationId='+encodeURIComponent(applicationId)+'&document='+kind}:{name:doc.name,url:doc.url};}
 return result;
}
