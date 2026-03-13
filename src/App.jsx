import { useState, useRef, useEffect } from "react";

// ── Google Drive config ────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = "484328350633-87dqplme1r4vmodmpufrou98h1t8e6g6.apps.googleusercontent.com";
const GOOGLE_FOLDER_ID = "1SvxbgQqujL9kO2w3QXZpNUFCazyWvu43";

// Module-level Google session — survives all React re-renders
const gSession = { token: null, email: null, client: null };

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtRs = (n) => n ? `Rs.${fmt(n)}=00` : "—";
const fmtW = (n) => {
  const num = parseInt(n || 0);
  if (!num) return "—";
  const ones=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const toW=(n)=>{if(n===0)return"";if(n<20)return ones[n]+" ";if(n<100)return tens[Math.floor(n/10)]+" "+(n%10?ones[n%10]+" ":"");if(n<1000)return ones[Math.floor(n/100)]+" Hundred "+(n%100?toW(n%100):"");if(n<100000)return toW(Math.floor(n/1000))+"Thousand "+toW(n%1000);if(n<10000000)return toW(Math.floor(n/100000))+"Lakh "+toW(n%100000);return toW(Math.floor(n/10000000))+"Crore "+toW(n%10000000);};
  return toW(num).trim()+" Only";
};

const PROPERTY_TYPES = ["Residential Plot","Residential House","Residential cum Commercial Building","Commercial Plot","Commercial Building","Agricultural Land","Industrial Property","Flat/Apartment","Villa","Row House"];
const CONSTRUCTION_TYPES = ["RCC Framed Structure","Load Bearing","Steel Structure","Pre-Engineered Building","Composite","Mixed"];
const CONDITIONS = ["Excellent","Good","Average","Satisfactory","Poor","Dilapidated"];
const ROOF_TYPES = ["RCC","Wood","Stone","Metal Sheet","Asbestos","GI Sheet","No Roof (Open Plot)"];
const WALL_TYPES = ["Brick Masonry","Hollow Block","AAC Block","Stone Masonry","Concrete"];
const FLOOR_TYPES = ["Vitrified Tiles","Marble","Granite","Ceramic Tiles","Cement/Mosaic","Bare Concrete","Good","Average"];
const ROAD_TYPES = ["National Highway","State Highway","Municipal Road","Concrete Road","Village Road","Internal Road","No Road Access"];
const PROP_CATEGORIES = ["A-Khatha","B-Khatha","Panchayat E-Khatha","Panchayat Manual Khatha","Laal Dora","Revenue Site","NA"];
const SEISMIC_ZONES = ["Zone-1","Zone-2","Zone-3","Zone-4","Zone-5"];
const RISK_LEVELS = ["Nil","Low","Medium","High"];
const LOCALITIES = ["Residential","Commercial","Mixed","Industrial","Others"];
const LOCALITY_CLASS = ["Posh","High","Middle","Low","Slum"];
const PROPERTY_AUTH = ["BBMP","BDA","BMRDA","BMTC","CMC","TMC","Panchayat","Municipality","Others","NA"];
const BANK_COLORS = ["#1f4e79","#7b1c1c","#1a5c38","#4a2070","#7a4a10","#1c4a5c","#3d3d00","#1c3a7a"];
const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi"];

const TEMPLATES = [
  { id:"sectional", label:"Sectional", sub:"IndusInd style" },
  { id:"tabular",   label:"Numbered Tabular", sub:"Federal Bank style" },
  { id:"hinduja",   label:"Technical Scrutiny", sub:"Hinduja Leyland style" },
  { id:"incred",    label:"Technical Appraisal", sub:"Incred Financial style" },
  { id:"religare",  label:"Land & Building Analysis", sub:"Religare Finvest style" },
  { id:"orix",      label:"Letter-Section Table", sub:"Orix Finance style" },
  { id:"arka",      label:"A–J Sections", sub:"Arka Fincap style" },
];

const suggestDep = (age, type) => {
  const a = parseFloat(age||0); if(!a) return "";
  const r = type?.includes("Load Bearing")?1.5:type?.includes("Steel")?1.2:1.0;
  return Math.min(Math.round(a*r),70).toString();
};

const DEFAULT_SECTIONS = { requestInfo:true, customerDetails:true, propertyDetails:true, documentDetails:true, physicalDetails:true, valuation:true, occupancy:true, violations:true, comments:true, photos:true, declaration:true };
const SECTION_LABELS = { requestInfo:"General Details", customerDetails:"Customer Details", propertyDetails:"Property Details", documentDetails:"Document Details", physicalDetails:"Physical Details", valuation:"Valuation", occupancy:"Occupancy", violations:"Deviations", comments:"Remarks", photos:"Photos", declaration:"Declaration" };

const defaultBank = () => ({ id:uid(), name:"", branch:"", color:BANK_COLORS[0], reportTitle:"VALUATION REPORT", reportTemplate:"sectional", headerNote:"", footerNote:"This report is prepared for valuation purposes only.", sections:{...DEFAULT_SECTIONS} });

const defaultVal = (bankId="") => ({
  id:uid(), bankId, status:"pending", createdAt:today(),
  applicationNumber:"", purpose:"To Ascertain fair market value", reportDate:today(),
  fieldEngineerName:"", fieldEngineerDate:today(),
  personMetName:"", personMetPhone:"", personRelation:"Self",
  ownerName:"", customerName:"", ownerContact:"",
  propertyAddress:"", legalAddress:"", city:"", district:"", state:"Karnataka", pincode:"",
  nearbyLandmark:"", latitude:"", longitude:"",
  propertyAuth:"BBMP", distanceFromBranch:"",
  propertyCategory:"B-Khatha", seismicZone:"Zone-2",
  layoutPlan:"NA", buildingPlan:"NA", constructionPermission:"NA",
  approvalAuthority:"NA", approvalNumber:"NA", approvalDate:"NA",
  propertyUsageDoc:"Residential", propertyUsageSite:"Residential", documentsStudied:"",
  propertyType:"Residential House", surveyNo:"",
  north:"", south:"", east:"", west:"",
  northDoc:"", southDoc:"", eastDoc:"", westDoc:"",
  boundariesMatching:"Yes", plotDemarcated:"Yes", plotAreaDoc:"", landArea:"",
  electricityConnection:"Yes", waterDrainage:"Yes",
  typeOfLocality:"Residential", classOfLocality:"Middle",
  roadFacing:"East", roadType:"Concrete Road", roadWidth:"",
  constructionType:"RCC Framed Structure", constructionAge:"", condition:"Good",
  roofType:"RCC", wallType:"Brick Masonry", floorType:"Good",
  interiorQuality:"Good", exteriorQuality:"Good", maintenanceLevel:"Good",
  residualAge:"", riskOfDemolition:"Low", amenitiesDesc:"",
  gfArea:"", ffArea:"", sfArea:"", tfArea:"", ff4Area:"", ff5Area:"",
  occupancyStatus:"Occupied", occupiedBy:"", occupancyRelation:"Self", occupiedSince:"",
  completionStatus:"Completed", rentalValue:"",
  landArea:"", landRate:"", landValue:"",
  farPermitted:"1.75", farConsidered:"1.75",
  builtUpAreaActual:"", builtUpAreaFAR:"",
  constructionRate:"", constructionValue:"",
  wardrobeValue:"", amenitiesValue:"",
  totalBuildingValueBeforeDep:"", depreciationPct:"", depreciationAuto:true,
  depreciationValue:"", totalBuildingValueAfterDep:"",
  finalValue:"", realizableValue:"", distressedValue:"",
  govtGuidelineRate:"", govtGuidelineValue:"", neighbouringRate:"",
  deviationRemarks:"", remarks:"",
  customFields:[], photos:[],
  engineerName:"", visitDate:today(),
  // Extra fields for specific banks
  frontSetback:"", rearSetback:"", leftSetback:"", rightSetback:"",
  buildingHeight:"", floorHeight:"",
  rentalRateAdopted:"",
  compositeRate:"", compositeValue:"",
  ndmaSeismicZone:"Zone-2", soilType:"", floodProne:"No",
});

const calcValuation = (v) => {
  const la=parseFloat(v.landArea||0), lr=parseFloat(v.landRate||0);
  const farBUA=parseFloat(v.builtUpAreaFAR||0)||Math.round(la*parseFloat(v.farConsidered||1.75));
  const cr=parseFloat(v.constructionRate||0);
  const dep=parseFloat(v.depreciationPct||0);
  const wv=parseFloat(v.wardrobeValue||0), av=parseFloat(v.amenitiesValue||0);
  const lv=la*lr;
  const cv=farBUA*cr;
  const totalBefore=cv+wv+av;
  const depVal=totalBefore*dep/100;
  const totalAfter=totalBefore-depVal;
  const fv=v.finalValue?parseFloat(v.finalValue):lv+totalAfter;
  return {
    landValue:lv?Math.round(lv).toString():v.landValue||"",
    constructionValue:cv?Math.round(cv).toString():"",
    totalBuildingValueBeforeDep:totalBefore?Math.round(totalBefore).toString():"",
    depreciationValue:depVal?Math.round(depVal).toString():"",
    totalBuildingValueAfterDep:totalAfter?Math.round(totalAfter).toString():"",
    finalValue:fv?Math.round(fv).toString():"",
    realizableValue:fv?Math.round(fv*0.9).toString():"",
    distressedValue:fv?Math.round(fv*0.75).toString():"",
    builtUpAreaFAR:v.builtUpAreaFAR||(farBUA?farBUA.toString():""),
  };
};

const totalFloorArea = (v) => [v.gfArea,v.ffArea,v.sfArea,v.tfArea,v.ff4Area,v.ff5Area].reduce((s,a)=>s+parseFloat(a||0),0);
const deviationPct = (v) => {
  const actual=totalFloorArea(v); const farBUA=parseFloat(v.builtUpAreaFAR||0);
  if(!actual||!farBUA) return null;
  return Math.round(((actual-farBUA)/farBUA)*100);
};
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--ink:#1a1714;--ink2:#4a4540;--paper:#faf8f5;--cream:#f2ede6;--gold:#c9921a;--gold-light:#f0d58c;--sage:#3d6b5a;--blue:#1f4e79;--border:#ddd5c8;--shadow:0 2px 12px rgba(26,23,20,.10);--shadow-lg:0 8px 32px rgba(26,23,20,.15);}
  body{font-family:'DM Sans',sans-serif;background:var(--cream);color:var(--ink);}
  .app{min-height:100vh;}
  .header{background:var(--blue);color:white;padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:64px;box-shadow:0 2px 8px rgba(0,0,0,.25);position:sticky;top:0;z-index:100;}
  .header-brand{display:flex;align-items:center;gap:12px;}
  .header-logo{width:36px;height:36px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;}
  .header-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;}
  .header-subtitle{font-size:11px;opacity:.7;letter-spacing:.5px;}
  .page{max-width:1100px;margin:0 auto;padding:28px 22px;}
  .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;}
  .page-title{font-family:'Playfair Display',serif;font-size:26px;color:var(--blue);}
  .page-sub{color:var(--ink2);font-size:14px;margin-top:4px;}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
  .stat-card{background:white;border-radius:12px;padding:18px;box-shadow:var(--shadow);border-left:4px solid var(--gold);}
  .stat-num{font-size:26px;font-weight:700;font-family:'Playfair Display',serif;color:var(--blue);}
  .stat-label{font-size:12px;color:var(--ink2);margin-top:3px;}
  .banks-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;}
  .bank-card{background:white;border-radius:16px;box-shadow:var(--shadow);overflow:hidden;cursor:pointer;transition:all .2s;border:2px solid transparent;}
  .bank-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg);border-color:var(--gold);}
  .bank-card-header{padding:18px 20px 14px;color:white;}
  .bank-card-name{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;}
  .bank-card-branch{font-size:12px;opacity:.8;margin-top:3px;}
  .add-bank-card{background:white;border-radius:16px;box-shadow:var(--shadow);cursor:pointer;transition:all .2s;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;min-height:155px;flex-direction:column;gap:8px;}
  .add-bank-card:hover{border-color:var(--gold);background:#fffdf9;}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
  .modal{background:white;border-radius:20px;max-width:700px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);}
  .modal-header{padding:22px 26px 0;display:flex;justify-content:space-between;align-items:center;}
  .modal-title{font-family:'Playfair Display',serif;font-size:19px;color:var(--blue);}
  .modal-close{width:30px;height:30px;border-radius:50%;border:none;background:var(--cream);cursor:pointer;font-size:15px;}
  .modal-body{padding:20px 26px;}
  .modal-footer{padding:14px 26px 20px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border);}
  .section-toggles{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px;}
  .toggle-item{display:flex;align-items:center;gap:6px;padding:8px 11px;border-radius:8px;background:var(--paper);border:1.5px solid var(--border);cursor:pointer;font-size:12px;transition:all .15s;}
  .toggle-item.on{background:#eef3fa;border-color:var(--blue);color:var(--blue);font-weight:600;}
  .color-picker{display:flex;gap:7px;flex-wrap:wrap;margin-top:5px;}
  .color-dot{width:26px;height:26px;border-radius:50%;cursor:pointer;border:3px solid transparent;transition:all .15s;}
  .color-dot.sel{border-color:var(--gold);transform:scale(1.2);}
  .template-pick{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;}
  .tmpl-opt{border:2px solid var(--border);border-radius:10px;padding:10px 12px;cursor:pointer;transition:all .15s;}
  .tmpl-opt.sel{border-color:var(--blue);background:#eef3fa;}
  .tmpl-opt-title{font-weight:600;font-size:12px;color:var(--ink);}
  .tmpl-opt-sub{font-size:10px;color:var(--ink2);margin-top:2px;}
  .val-card{background:white;border-radius:12px;padding:14px 18px;box-shadow:var(--shadow);display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;cursor:pointer;transition:all .2s;border:2px solid transparent;margin-bottom:11px;}
  .val-card:hover{border-color:var(--gold);transform:translateY(-1px);box-shadow:var(--shadow-lg);}
  .val-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;}
  .val-name{font-weight:600;font-size:14px;}
  .val-address{font-size:12px;color:var(--ink2);margin-top:2px;}
  .val-meta{font-size:11px;color:var(--ink2);margin-top:5px;display:flex;gap:10px;flex-wrap:wrap;}
  .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;}
  .badge-pending{background:#fff3cd;color:#856404;}.badge-progress{background:#cfe2ff;color:#084298;}.badge-done{background:#d1e7dd;color:#0a3622;}
  .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .2s;}
  .btn-primary{background:var(--blue);color:white;}.btn-primary:hover{background:#163a5e;}
  .btn-gold{background:var(--gold);color:white;}.btn-gold:hover{background:#a87816;}
  .btn-outline{background:transparent;border:2px solid var(--border);color:var(--ink2);}.btn-outline:hover{border-color:var(--blue);color:var(--blue);}
  .btn-danger{background:#dc3545;color:white;}
  .btn-sm{padding:5px 11px;font-size:12px;}.btn-lg{padding:12px 26px;font-size:14px;}
  .form-card{background:white;border-radius:14px;box-shadow:var(--shadow);overflow:hidden;margin-bottom:18px;}
  .form-sec-hdr{background:var(--blue);color:white;padding:12px 20px;font-family:'Playfair Display',serif;font-size:14px;display:flex;align-items:center;gap:8px;}
  .form-body{padding:18px 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:13px;}
  .form-body.c2{grid-template-columns:repeat(2,1fr);}.form-body.c1{grid-template-columns:1fr;}
  .form-body.c4{grid-template-columns:repeat(4,1fr);}
  .s2{grid-column:span 2;}.s3{grid-column:span 3;}.s4{grid-column:span 4;}
  .field{display:flex;flex-direction:column;gap:4px;}
  .field label{font-size:10px;font-weight:700;color:var(--ink2);letter-spacing:.3px;text-transform:uppercase;}
  .field input,.field select,.field textarea{padding:8px 11px;border:1.5px solid var(--border);border-radius:7px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--ink);background:var(--paper);transition:border-color .2s;outline:none;}
  .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--blue);}
  .field textarea{min-height:72px;resize:vertical;}
  .field-hint{font-size:10px;color:var(--ink2);}
  .auto-tag{font-size:10px;font-weight:700;background:#eef3fa;color:var(--blue);border-radius:20px;padding:2px 6px;margin-left:4px;}
  .steps{display:flex;margin-bottom:22px;background:white;border-radius:12px;box-shadow:var(--shadow);overflow:hidden;}
  .step{flex:1;padding:11px 8px;display:flex;align-items:center;gap:7px;cursor:pointer;border-right:1px solid var(--border);transition:background .2s;}
  .step:last-child{border-right:none;}.step:hover{background:var(--cream);}
  .step.active{background:var(--blue);color:white;}.step.done{background:#eef7f0;}
  .step-num{width:22px;height:22px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}
  .step.active .step-num{background:var(--gold);color:white;}.step.done .step-num{background:var(--sage);color:white;}
  .step-label{font-size:11px;font-weight:500;}.step.active .step-label{color:white;}
  .photo-drop{border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:all .2s;background:var(--paper);}
  .photo-drop:hover{border-color:var(--blue);background:#eef3fa;}
  .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:10px;margin-top:14px;}
  .photo-item{border-radius:9px;overflow:hidden;aspect-ratio:4/3;background:var(--border);position:relative;}
  .photo-item img{width:100%;height:100%;object-fit:cover;display:block;}
  .photo-remove{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:white;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;}
  .photo-caption input{width:100%;border:none;border-bottom:1.5px solid var(--border);background:transparent;font-size:11px;outline:none;padding:3px 0;}
  .cfield-row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;}
  .calc-box{background:linear-gradient(135deg,var(--blue),#163a5e);color:white;border-radius:14px;padding:18px;}
  .calc-title{font-family:'Playfair Display',serif;font-size:15px;margin-bottom:14px;opacity:.9;}
  .calc-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:12px;}
  .calc-total{background:var(--gold);border-radius:9px;padding:11px 14px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;}
  .calc-total-label{font-size:12px;font-weight:600;}.calc-total-value{font-size:18px;font-weight:700;font-family:'Playfair Display',serif;}
  .calc-sub-vals{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}
  .calc-sub{background:rgba(255,255,255,.1);border-radius:8px;padding:9px 12px;}
  .calc-sub-label{font-size:10px;opacity:.75;}.calc-sub-value{font-size:13px;font-weight:600;margin-top:2px;}
  .actions-bar{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;}
  .breadcrumb{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--ink2);margin-bottom:16px;}
  .bc-link{cursor:pointer;color:var(--blue);font-weight:500;}.bc-link:hover{text-decoration:underline;}
  .empty-state{text-align:center;padding:50px 20px;color:var(--ink2);}
  .empty-icon{font-size:46px;margin-bottom:12px;}
  .empty-title{font-family:'Playfair Display',serif;font-size:19px;color:var(--blue);}
  @media print{.no-print{display:none !important;}body{background:white;}}
  .rpt-wrap{padding:20px 16px;}
  .rpt-page{background:white;max-width:960px;margin:0 auto;box-shadow:var(--shadow-lg);border-radius:8px;overflow:hidden;}
  .rpt-table{width:100%;border-collapse:collapse;font-size:12px;}
  .rpt-table td{padding:5px 9px;border:1px solid #ccc;vertical-align:top;}
  .rpt-table td.lbl{font-weight:600;color:#333;background:#f5f5f5;width:30%;}
  .rpt-table td.lbl2{font-weight:600;color:#333;background:#f5f5f5;width:22%;}
  .sig-pad-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;}
  .sig-pad-modal{background:white;border-radius:18px;padding:26px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35);}
  .sig-canvas{border:2px solid var(--border);border-radius:10px;cursor:crosshair;background:#fafaf8;display:block;touch-action:none;width:100%;}
  .sig-block-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:16px;padding-top:12px;border-top:1.5px solid #ccc;}
  .sig-block{text-align:center;}
  .sig-img-wrap{height:64px;display:flex;align-items:flex-end;justify-content:center;border-bottom:1.5px solid #333;margin-bottom:5px;}
  .sig-img-wrap img{max-height:60px;max-width:200px;object-fit:contain;}
  .sig-empty-line{height:64px;border-bottom:1.5px solid #333;margin-bottom:5px;}
  .sig-name-bold{font-size:12px;font-weight:700;}
  .sig-sub-text{font-size:10px;color:#555;margin-top:2px;line-height:1.5;}
  .decl-box{background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:12px 16px;font-size:12px;line-height:1.9;}
  .convert-modal{background:white;border-radius:18px;padding:28px;max-width:480px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.35);}
  .convert-option{border:2px solid var(--border);border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:12px;margin-bottom:8px;}
  .convert-option:hover,.convert-option.sel{border-color:var(--blue);background:#eef3fa;}
  .rpt-photos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
  .rpt-photo img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px 4px 0 0;display:block;}
  .rpt-photo-cap{font-size:10px;text-align:center;color:#555;padding:3px;background:#f5f5f5;border:1px solid #ddd;border-top:none;border-radius:0 0 4px 4px;}
  @media(max-width:768px){.stats{grid-template-columns:repeat(2,1fr);}.form-body{grid-template-columns:1fr 1fr;}.s2,.s3,.s4{grid-column:span 1;}.steps{flex-direction:column;}.rpt-photos{grid-template-columns:repeat(2,1fr);}}
`;

// ─── Shared UI Components ─────────────────────────────────────────────────────
// Adobe-style signature fonts
const SIG_FONTS = [
  { id:"dancing",   label:"Classic",    css:"'Dancing Script', cursive",    size:38 },
  { id:"pinyon",    label:"Formal",     css:"'Pinyon Script', cursive",      size:40 },
  { id:"allura",    label:"Elegant",    css:"'Allura', cursive",             size:36 },
  { id:"pacifico",  label:"Bold",       css:"'Pacifico', cursive",           size:30 },
  { id:"kaushan",   label:"Sharp",      css:"'Kaushan Script', cursive",     size:32 },
];
const SIG_COLORS = ["#1a1714","#1f4e79","#1a3a4a","#2d2d2d","#7b1c1c"];

function SignatureModal({ signerName, onSave, onClose }) {
  const [font, setFont] = useState(SIG_FONTS[0]);
  const [color, setColor] = useState(SIG_COLORS[0]);
  const [name, setName] = useState(signerName || "K.P. Satish Babu");
  const canvasRef = useRef();

  // Render preview to canvas for saving as image
  const renderToCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 420, 100);
    ctx.font = `${font.size}px ${font.css}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(name, 210, 68);
    // subtle underline
    const metrics = ctx.measureText(name);
    const w = Math.min(metrics.width + 20, 380);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(210 - w/2, 78);
    ctx.lineTo(210 + w/2, 78);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const apply = () => {
    renderToCanvas();
    setTimeout(() => onSave(canvasRef.current.toDataURL("image/png"), font, color, name), 60);
  };

  return (
    <div className="sig-pad-overlay" onClick={onClose}>
      <div className="sig-pad-modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pinyon+Script&family=Allura&family=Pacifico&family=Kaushan+Script&display=swap"/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"var(--blue)",marginBottom:2}}>Apply Digital Signature</div>
        <div style={{fontSize:11,color:"var(--ink2)",marginBottom:14}}>Select a style — your name is applied as a legally-formatted digital signature.</div>

        <div className="field" style={{marginBottom:12}}>
          <label>Signer Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={{fontSize:13}}/>
        </div>

        <div style={{fontSize:10,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>Signature Style</div>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
          {SIG_FONTS.map(f => (
            <div key={f.id} onClick={()=>setFont(f)}
              style={{border:`2px solid ${font.id===f.id?"var(--blue)":"var(--border)"}`,borderRadius:10,padding:"10px 18px",cursor:"pointer",background:font.id===f.id?"#eef3fa":"white",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .15s"}}>
              <span style={{fontFamily:f.css,fontSize:f.size,color:color,lineHeight:1.2}}>{name}</span>
              <span style={{fontSize:10,color:"var(--ink2)",background:"var(--cream)",borderRadius:20,padding:"2px 8px"}}>{f.label}</span>
            </div>
          ))}
        </div>

        <div style={{fontSize:10,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>Ink Colour</div>
        <div style={{display:"flex",gap:9,marginBottom:18}}>
          {SIG_COLORS.map(c=>(
            <div key={c} onClick={()=>setColor(c)} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${color===c?"var(--gold)":"transparent"}`,transition:"all .15s",transform:color===c?"scale(1.2)":"none"}}/>
          ))}
        </div>

        <canvas ref={canvasRef} width={420} height={100} style={{display:"none"}}/>

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={apply}>Apply Signature ✍</button>
        </div>
      </div>
    </div>
  );
}

function ConvertModal({ currentTemplate, onConvert, onClose }) {
  return (
    <div className="sig-pad-overlay" onClick={onClose}>
      <div className="convert-modal" onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"var(--blue)",marginBottom:6}}>Convert Report Format</div>
        <div style={{fontSize:12,color:"var(--ink2)",marginBottom:14}}>Current: <strong>{TEMPLATES.find(t=>t.id===currentTemplate)?.label}</strong>. All data is preserved.</div>
        {TEMPLATES.map(t => (
          <div key={t.id} className={"convert-option"+(currentTemplate===t.id?" sel":"")} onClick={()=>onConvert(t.id)}>
            <div style={{fontSize:22}}>📋</div>
            <div>
              <div style={{fontWeight:600,fontSize:13}}>{t.label}</div>
              <div style={{fontSize:11,color:"var(--ink2)"}}>{t.sub}</div>
            </div>
            {currentTemplate===t.id && <div style={{marginLeft:"auto",color:"var(--blue)",fontSize:11,fontWeight:600}}>Active</div>}
          </div>
        ))}
        <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const F = ({label,hint,span,children}) => (
  <div className={"field"+(span?" s"+span:"")}>
    <label>{label}</label>{children}
    {hint && <span className="field-hint">{hint}</span>}
  </div>
);
const Sel = ({options,...p}) => <select {...p}>{options.map(o=><option key={o}>{o}</option>)}</select>;
const YN = (props) => <Sel options={["Yes","No","NA"]} {...props} />;

const Header = ({children}) => (
  <div className="header">
    <div className="header-brand">
      <div className="header-logo">📐</div>
      <div><div className="header-title">K P Satish Babu</div><div className="header-subtitle">Site Valuation System</div></div>
    </div>
    <div style={{display:"flex",gap:8,alignItems:"center"}}>{children}</div>
  </div>
);
const GBtn = ({onClick,children}) => (
  <button className="btn btn-outline" style={{color:"white",borderColor:"rgba(255,255,255,.4)"}} onClick={onClick}>{children}</button>
);

// Shared report primitives
const RptHdr = ({firmName="K P Satish Babu", title, subtitle, bank, col, v, right}) => (
  <div style={{borderBottom:"3px solid "+(col||"#1f4e79"),paddingBottom:12,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
    <div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:col||"#1f4e79"}}>{firmName}</div>
      <div style={{fontSize:10,color:"#555",marginTop:2,lineHeight:1.6}}>B.E (Civil) AMIE | Registered Valuer &amp; Chartered Engineer<br/>Approved Valuer — Income Tax Dept. | Mob: 9986509950 / 9845035535<br/>No. 2999, 2nd Main, 17th Cross, BSK 2nd Stage, Bangalore – 560070</div>
      {bank && <div style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:5,background:col,color:"white",borderRadius:4,padding:"2px 10px",fontSize:10,fontWeight:600}}>{bank.name}{bank.branch?" — "+bank.branch:""}</div>}
    </div>
    <div style={{textAlign:"right"}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:col||"#1f4e79"}}>{title}</div>
      {subtitle && <div style={{fontSize:10,color:"#777",marginTop:2}}>{subtitle}</div>}
      {v?.applicationNumber && <div style={{fontSize:10,color:"#777",marginTop:3}}>App No: {v.applicationNumber}</div>}
      <div style={{fontSize:10,color:"#777"}}>Date: {v?.reportDate}</div>
      {right}
    </div>
  </div>
);

const RptSigBlock = ({v, sig, sigFont, sigColor, col}) => (
  <div>
    <div className="decl-box">
      <strong>Declaration:</strong><br/>I/We hereby declare that :<br/>
      <div style={{paddingLeft:4,marginTop:4}}>
        (1) The property was inspected by <strong>{v.fieldEngineerName||"—"}</strong> &amp; Report Done by <strong>{v.engineerName||"K P Satish Babu"}</strong>.<br/>
        (2) I/We have no direct or Indirect Interest in the property valued.<br/>
        (3) The information furnished above is true and correct to my/our knowledge.<br/>
        (4) Total Fair Market Value of the property: <strong style={{color:col||"#1f4e79"}}>{fmtRs(v.finalValue)}</strong>
      </div>
    </div>
    <div style={{marginTop:16,display:"flex",justifyContent:"flex-end"}}>
      <div style={{textAlign:"center",minWidth:220}}>
        <div style={{height:72,borderBottom:"1.5px solid #333",marginBottom:6,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:4}}>
          {sig
            ? <img src={sig} alt="Signature" style={{maxHeight:68,maxWidth:240,objectFit:"contain"}}/>
            : <div style={{color:"#bbb",fontSize:10,fontStyle:"italic",paddingBottom:4}}>Signature not yet applied</div>
          }
        </div>
        <div style={{fontWeight:700,fontSize:12,letterSpacing:.3}}>K.P. SATISH BABU</div>
        <div style={{fontSize:10,color:"#555",marginTop:2,lineHeight:1.55}}>
          B.E (Civil) AMIE | Registered Valuer &amp; Chartered Engineer<br/>
          Approved Valuer — Income Tax Dept.<br/>
          Date: {v.reportDate} | Place: Bangalore
        </div>
      </div>
    </div>
    {sig ? (
      <div style={{marginTop:10,textAlign:"center",fontSize:10,color:"#888",borderTop:"1px dashed #ccc",paddingTop:7,letterSpacing:.2}}>
        ✔ This document has been digitally signed by <strong style={{color:"#555"}}>K.P. Satish Babu</strong> on {v.reportDate || today()}
      </div>
    ) : (
      <div style={{marginTop:10,textAlign:"center",fontSize:10,color:"#bbb",borderTop:"1px dashed #ddd",paddingTop:7,fontStyle:"italic"}}>
        Signature pending — click "Sign Report" to apply digital signature
      </div>
    )}
  </div>
);

const ValSummaryBox = ({v, calc, col}) => (
  <div style={{background:"linear-gradient(135deg,"+(col||"#1f4e79")+","+(col||"#1f4e79")+"aa)",color:"white",borderRadius:8,padding:"14px 18px"}}>
    {(v.landValue||calc.landValue) && <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.15)",fontSize:12}}><span>Land Value ({fmt(v.landArea)} sft @ Rs.{fmt(v.landRate)}/sft)</span><span>{fmtRs(v.landValue||calc.landValue)}</span></div>}
    {(v.constructionValue||calc.constructionValue) && <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.15)",fontSize:12}}><span>Construction ({fmt(v.builtUpAreaFAR)} sft @ Rs.{fmt(v.constructionRate)}/sft)</span><span>{fmtRs(v.constructionValue||calc.constructionValue)}</span></div>}
    {v.wardrobeValue && <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.15)",fontSize:12}}><span>Ward Robes</span><span>{fmtRs(v.wardrobeValue)}</span></div>}
    {v.amenitiesValue && <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.15)",fontSize:12}}><span>Amenities</span><span>{fmtRs(v.amenitiesValue)}</span></div>}
    {(v.totalBuildingValueBeforeDep||calc.totalBuildingValueBeforeDep) && <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.15)",fontSize:12}}><span>Total Building Value (Before Dep.)</span><span>{fmtRs(v.totalBuildingValueBeforeDep||calc.totalBuildingValueBeforeDep)}</span></div>}
    {v.depreciationPct && <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.15)",fontSize:12}}><span>Depreciation ({v.depreciationPct}%)</span><span style={{color:"#ffd580"}}>- {fmtRs(v.depreciationValue||calc.depreciationValue)}</span></div>}
    {(v.totalBuildingValueAfterDep||calc.totalBuildingValueAfterDep) && <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.15)",fontSize:12}}><span>Building Value After Depreciation</span><span>{fmtRs(v.totalBuildingValueAfterDep||calc.totalBuildingValueAfterDep)}</span></div>}
    <div style={{background:"#c9921a",borderRadius:6,padding:"8px 12px",marginTop:8,display:"flex",justifyContent:"space-between",fontWeight:700}}>
      <span>FAIR MARKET VALUE</span>
      <span style={{fontFamily:"'Playfair Display',serif",fontSize:15}}>{fmtRs(v.finalValue||calc.finalValue)}</span>
    </div>
    <div style={{marginTop:3,fontSize:10,color:"rgba(255,255,255,.7)",textAlign:"center"}}>{fmtW(v.finalValue||calc.finalValue)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:8}}>
      <div style={{background:"rgba(255,255,255,.12)",borderRadius:5,padding:"7px 10px",fontSize:11}}><div style={{opacity:.75}}>Realizable (90%)</div><strong>{fmtRs(v.realizableValue||calc.realizableValue)}</strong></div>
      <div style={{background:"rgba(255,255,255,.12)",borderRadius:5,padding:"7px 10px",fontSize:11}}><div style={{opacity:.75}}>Distressed (75%)</div><strong>{fmtRs(v.distressedValue||calc.distressedValue)}</strong></div>
    </div>
  </div>
);

const DevTable = ({v}) => {
  const floorRows = [["Ground Floor",v.gfArea],["First Floor",v.ffArea],["Second Floor",v.sfArea],["Third Floor",v.tfArea],["4th Floor",v.ff4Area],["5th Floor",v.ff5Area]].filter(([,a])=>a);
  const totalActual = totalFloorArea(v);
  const devPct = deviationPct(v);
  return (
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginTop:8}}>
      <thead><tr style={{background:"#1f4e79"}}><th style={{color:"white",padding:"4px 8px",textAlign:"left",fontSize:11}}>Details</th><th style={{color:"white",padding:"4px 8px",fontSize:11}}>As per Site</th><th style={{color:"white",padding:"4px 8px",fontSize:11}}>As per Plan</th><th style={{color:"white",padding:"4px 8px",fontSize:11}}>% Dev</th></tr></thead>
      <tbody>
        <tr><td style={{padding:"4px 8px",border:"1px solid #ddd"}}>Total Plot Area (sft)</td><td style={{padding:"4px 8px",border:"1px solid #ddd"}}>{v.landArea||"—"}</td><td style={{padding:"4px 8px",border:"1px solid #ddd"}}>{v.plotAreaDoc||"NA"}</td><td style={{padding:"4px 8px",border:"1px solid #ddd"}}>NA</td></tr>
        {floorRows.map(([fl,ar])=><tr key={fl}><td style={{padding:"4px 8px",border:"1px solid #ddd"}}>{fl}</td><td style={{padding:"4px 8px",border:"1px solid #ddd"}}>{fmt(ar)} sft</td><td style={{padding:"4px 8px",border:"1px solid #ddd"}}>NA</td><td style={{padding:"4px 8px",border:"1px solid #ddd"}}>NA</td></tr>)}
        <tr style={{background:"#f5f5f5"}}><td style={{padding:"4px 8px",border:"1px solid #ddd",fontWeight:700}}>Total BUA</td><td style={{padding:"4px 8px",border:"1px solid #ddd",fontWeight:700}}>{fmt(totalActual)} sft</td><td style={{padding:"4px 8px",border:"1px solid #ddd"}}>FAR {v.farConsidered} = {fmt(v.builtUpAreaFAR)} sft</td><td style={{padding:"4px 8px",border:"1px solid #ddd",fontWeight:700,color:devPct>0?"#dc3545":"inherit"}}>{devPct!=null?devPct+"%":"NA"}</td></tr>
      </tbody>
    </table>
  );
};

// ─── REPORT TEMPLATES ─────────────────────────────────────────────────────────

// ── 1. SECTIONAL (IndusInd style) ─────────────────────────────────────────────
function SectionalReport({v, bank, col, sig, sigFont, sigColor}) {
  const calc = calcValuation(v);
  const sec = bank?.sections || DEFAULT_SECTIONS;
  const floorRows = [["Ground Floor (GF)",v.gfArea],["First Floor (FF)",v.ffArea],["Second Floor (SF)",v.sfArea],["Third Floor (TF)",v.tfArea],["4th Floor",v.ff4Area],["5th Floor",v.ff5Area]].filter(([,a])=>a);
  const totalActual = totalFloorArea(v);
  const SH = ({children}) => <div style={{background:col,color:"white",padding:"5px 12px",borderRadius:4,fontSize:12,fontFamily:"'Playfair Display',serif",marginBottom:7}}>{children}</div>;
  const T = ({rows}) => <table className="rpt-table" style={{marginBottom:14}}><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} className={j%2===0?"lbl":""}>{cell}</td>)}</tr>)}</tbody></table>;
  return (
    <div style={{padding:"28px 36px",fontFamily:"'DM Sans',sans-serif"}}>
      <RptHdr title={bank?.reportTitle||"VALUATION REPORT"} bank={bank} col={col} v={v}/>
      {bank?.headerNote && <div style={{background:"#f9f9f9",border:"1.5px solid "+col,borderRadius:6,padding:"7px 12px",fontSize:11,color:"#555",marginBottom:14}}>{bank.headerNote}</div>}
      {sec.requestInfo && <><SH>GENERAL DETAILS</SH><T rows={[["Valuation request given by",bank?.name||"—"+(bank?.branch?", "+bank.branch:""),"Purpose",v.purpose||"To Ascertain fair market value"],["Date of Valuation report",v.reportDate,"Field Engineer / Visit Date",(v.fieldEngineerName||"—")+" / "+v.fieldEngineerDate],["Assessment &amp; Signed by","K.P. Satish Babu","Occupation",v.occupancyStatus]]}/></>}
      {sec.customerDetails && <><SH>CUSTOMER DETAILS</SH><T rows={[["Customer Name",v.customerName||v.ownerName||"—","Application Number",v.applicationNumber||"—"],["Property Owner Name",v.ownerName||"—","Contact",v.ownerContact||"—"],["Person Met at Site",v.personMetName||"—","Phone",v.personMetPhone||"—"]]}/></>}
      {sec.documentDetails && <><SH>DOCUMENT DETAILS</SH><T rows={[["Layout Plan",v.layoutPlan,"Approval Authority",v.approvalAuthority||"NA"],["Building Plan",v.buildingPlan,"Approval No. &amp; Date",v.approvalNumber&&v.approvalNumber!=="NA"?v.approvalNumber+" / "+v.approvalDate:"NA"],["Construction Permission",v.constructionPermission,"Usage as per Plan",v.propertyUsageDoc||"NA"],["Usage at Site",v.propertyUsageSite||v.propertyType||"—","Documents Studied",v.documentsStudied||"—"]]}/></>}
      {sec.physicalDetails && (
        <>
          <SH>PHYSICAL DETAILS</SH>
          <T rows={[
            ["Address at Site",[v.propertyAddress,v.city,v.district,v.state,v.pincode].filter(Boolean).join(", "),"Legal Address",v.legalAddress||v.surveyNo||"—"],
            ["Nearby Landmark",v.nearbyLandmark||"—","Lat / Long",v.latitude&&v.longitude?v.latitude+", "+v.longitude+"E":"—"],
            ["Property Authority",v.propertyAuth,"Distance from Branch",v.distanceFromBranch?v.distanceFromBranch+" Kms.":"—"],
            ["Type / Class of Locality",v.typeOfLocality+" / "+v.classOfLocality,"Seismic Zone",v.seismicZone||"—"],
            ["Road",v.roadFacing+" facing, "+v.roadType+(v.roadWidth?", "+v.roadWidth+"ft":""),"Electricity / Water",v.electricityConnection+" / "+v.waterDrainage],
            ["Site Area",v.landArea?fmt(v.landArea)+" sft":"—","Property Category",v.propertyCategory||"—"],
            ["Plot Demarcated",v.plotDemarcated,"Boundaries Matching",v.boundariesMatching],
          ]}/>
          <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:6,textTransform:"uppercase"}}>Boundaries</div>
          <table className="rpt-table" style={{marginBottom:14}}><thead><tr><th style={{background:col,color:"white",padding:"5px 9px",textAlign:"left"}}>Direction</th><th style={{background:col,color:"white",padding:"5px 9px"}}>As per Deed</th><th style={{background:col,color:"white",padding:"5px 9px"}}>Actual at Site</th></tr></thead><tbody>
            {[["North",v.northDoc,v.north],["South",v.southDoc,v.south],["East",v.eastDoc,v.east],["West",v.westDoc,v.west]].map(([d,doc,site])=><tr key={d}><td className="lbl" style={{border:"1px solid #ccc",padding:"4px 9px"}}>{d}</td><td style={{border:"1px solid #ccc",padding:"4px 9px"}}>{doc||"—"}</td><td style={{border:"1px solid #ccc",padding:"4px 9px"}}>{site||"—"}</td></tr>)}
          </tbody></table>
          <T rows={[["Construction Type",v.constructionType,"Age / Residual",v.constructionAge?v.constructionAge+" yrs / "+(v.residualAge||"—")+" yrs":"—"],["Condition / Maintenance",v.condition+" / "+v.maintenanceLevel,"Roof / Floor",v.roofType+" / "+v.floorType],["Interior / Exterior",v.interiorQuality+" / "+v.exteriorQuality,"Risk of Demolition",v.riskOfDemolition||"—"],["Amenities",v.amenitiesDesc||"—","",""]]}>
          </T>
          {floorRows.length>0 && (
            <>
              <div style={{fontSize:11,fontWeight:700,color:"#555",marginBottom:5,textTransform:"uppercase"}}>Property Description (Floor-wise)</div>
              <table className="rpt-table" style={{marginBottom:14}}><thead><tr><th style={{background:col,color:"white",padding:"5px 9px",textAlign:"left"}}>Floor</th><th style={{background:col,color:"white",padding:"5px 9px"}}>BUA (sft)</th><th style={{background:col,color:"white",padding:"5px 9px"}}>Rooms</th><th style={{background:col,color:"white",padding:"5px 9px"}}>Usage</th></tr></thead><tbody>
                {floorRows.map(([fl,ar])=><tr key={fl}><td className="lbl" style={{border:"1px solid #ccc",padding:"4px 9px"}}>{fl}</td><td style={{border:"1px solid #ccc",padding:"4px 9px"}}>{fmt(ar)} sft</td><td style={{border:"1px solid #ccc",padding:"4px 9px"}}></td><td style={{border:"1px solid #ccc",padding:"4px 9px"}}></td></tr>)}
                <tr style={{background:"#e8f0fb"}}><td style={{border:"1px solid #ccc",padding:"4px 9px",fontWeight:700}}>Total</td><td style={{border:"1px solid #ccc",padding:"4px 9px",fontWeight:700}}>{fmt(totalActual)} sft</td><td style={{border:"1px solid #ccc",padding:"4px 9px",color:"#555"}}>FAR {v.farConsidered}</td><td style={{border:"1px solid #ccc",padding:"4px 9px",fontWeight:700}}>{fmt(v.builtUpAreaFAR)} sft</td></tr>
              </tbody></table>
            </>
          )}
        </>
      )}
      {sec.occupancy && <><SH>OCCUPANCY DETAILS</SH><T rows={[["Status",v.occupancyStatus,"Occupied by",v.occupiedBy||"—"],["Relationship",v.occupancyRelation||"—","Occupied Since",v.occupiedSince||"—"],["Completion Status",v.completionStatus||"Completed","Rental Value",v.rentalValue||"NA"]]}/></>}
      {sec.valuation && <><SH>VALUATION</SH><ValSummaryBox v={v} calc={calc} col={col}/><div style={{marginTop:8}}/></>}
      {sec.violations && floorRows.length>0 && <><SH>SPECIFIC DETAILS OF DEVIATION AT SITE</SH><DevTable v={v}/><div style={{marginTop:8}}/></>}
      {v.deviationRemarks && <div style={{padding:"7px 10px",background:"#fafafa",border:"1px solid #ddd",borderRadius:4,fontSize:11,marginTop:6,marginBottom:12}}>{v.deviationRemarks}</div>}
      {sec.comments && v.remarks && <><SH>REMARKS</SH><div style={{padding:"8px 12px",background:"#fafafa",border:"1px solid #ddd",borderRadius:4,fontSize:12,lineHeight:1.7,whiteSpace:"pre-line",marginBottom:14}}>{v.remarks}</div></>}
      {sec.photos && v.photos?.length>0 && <><SH>SITE PHOTOGRAPHS</SH><div className="rpt-photos" style={{marginBottom:14}}>{v.photos.map(p=><div key={p.id} className="rpt-photo"><img src={p.url} alt={p.caption}/><div className="rpt-photo-cap">{p.caption||"Site Photo"}</div></div>)}</div></>}
      {sec.declaration && <RptSigBlock v={v} sig={sig} sigFont={sigFont} sigColor={sigColor} col={col}/>}
      <div style={{textAlign:"center",marginTop:14,fontSize:10,color:"#999",borderTop:"1px solid #eee",paddingTop:10}}>{bank?.footerNote||"This report is prepared for valuation purposes only."}</div>
    </div>
  );
}

// ── 2. TABULAR (Federal Bank style) ───────────────────────────────────────────
function TabularReport({v, bank, col, sig, sigFont, sigColor}) {
  const calc = calcValuation(v);
  const sec = bank?.sections || DEFAULT_SECTIONS;
  const floorRows = [["Ground Floor",v.gfArea],["First Floor",v.ffArea],["Second Floor",v.sfArea],["Third Floor",v.tfArea],["4th Floor",v.ff4Area],["5th Floor",v.ff5Area]].filter(([,a])=>a);
  const totalActual = totalFloorArea(v);
  const SH = ({n,children}) => <div style={{background:"#e8f0fb",borderLeft:"4px solid "+(col||"#1f4e79"),padding:"6px 14px",fontWeight:700,fontSize:12,color:col||"#1f4e79"}}>{n && <span style={{background:col,color:"white",borderRadius:"50%",width:18,height:18,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,marginRight:7}}>{n}</span>}{children}</div>;
  const R = ({num,label,value,label2,value2}) => (
    <tr>
      <td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#f9f9f9",width:36,textAlign:"center",fontWeight:600,color:"#555",fontSize:11}}>{num}</td>
      <td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#fafafa",fontWeight:600,color:"#444",width:"28%",fontSize:11}}>{label}</td>
      <td style={{border:"1px solid #ddd",padding:"5px 10px",fontSize:12}}>{value||"—"}</td>
      {label2!==undefined && <><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#fafafa",fontWeight:600,color:"#444",width:"22%",fontSize:11}}>{label2}</td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontSize:12}}>{value2||"—"}</td></>}
    </tr>
  );
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:col,color:"white",padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700}}>K P Satish Babu</div>
          <div style={{fontSize:10,opacity:.85,marginTop:2,lineHeight:1.5}}>B.E (Civil) AMIE | Registered Valuer &amp; Chartered Engineer<br/>Approved Valuer — Income Tax Dept. | Mob: 9986509950 / 9845035535</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14}}>{bank?.reportTitle||"TECHNICAL REPORT"}</div>
          {bank && <div style={{fontSize:10,opacity:.8,marginTop:3}}>{bank.name}{bank.branch?" — "+bank.branch:""}</div>}
          <div style={{fontSize:10,opacity:.8}}>Date: {v.reportDate}</div>
        </div>
      </div>
      <div>
        {sec.customerDetails && <><SH n="1">CUSTOMER DETAILS</SH><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <R num="1.1" label="Application Number" value={v.applicationNumber} label2="Reference Number" value2="NA"/>
          <R num="1.2" label="Customer Name" value={v.customerName||v.ownerName} label2="Property Owner Name" value2={v.ownerName}/>
          <R num="1.3" label="Date &amp; Time of Inspection" value={v.fieldEngineerDate} label2="Visit Done By" value2={v.fieldEngineerName}/>
          <R num="1.4" label="Case Type" value={v.purpose||"LAP"} label2="Relationship with Customer" value2={v.personRelation||"Self"}/>
          <R num="1.5" label="Contact No. of Person Met" value={v.personMetPhone} label2="Person Met at Site" value2={v.personMetName}/>
        </tbody></table></>}
        {sec.propertyDetails && <><SH n="2">PROPERTY DETAILS</SH><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <R num="2.1" label="Address of Property" value={[v.propertyAddress,v.city,v.district,v.state,v.pincode].filter(Boolean).join(", ")} label2="Legal Address" value2={v.legalAddress||v.surveyNo}/>
          <R num="2.2" label="Pin Code" value={v.pincode} label2="Nearby Landmark" value2={v.nearbyLandmark}/>
          <R num="2.3" label="Latitude &amp; Longitude" value={v.latitude&&v.longitude?v.latitude+" & "+v.longitude+"E":"—"} label2="Seismic Zone" value2={v.seismicZone}/>
        </tbody></table></>}
        {sec.documentDetails && <><SH n="3">DOCUMENT DETAILS</SH><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <R num="3.1" label="Layout Plan (Y/N)" value={v.layoutPlan} label2="Approval Number &amp; Date" value2={v.approvalNumber!=="NA"?v.approvalNumber+" / "+v.approvalDate:"NA"}/>
          <R num="3.2" label="Building Plan (Y/N)" value={v.buildingPlan} label2="Approval Authority" value2={v.approvalAuthority}/>
          <R num="3.3" label="Construction Permission (Y/N)" value={v.constructionPermission} label2="Property Category" value2={v.propertyCategory}/>
          <R num="3.4" label="Other Document Provided" value={v.documentsStudied} label2="Type of Usage at Site" value2={v.propertyUsageSite||v.propertyType}/>
        </tbody></table></>}
        {sec.physicalDetails && <><SH n="4">PHYSICAL DETAILS</SH><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <tr><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#f9f9f9",width:36,textAlign:"center",fontWeight:600,color:"#555",fontSize:11}}>4.1</td><td colSpan={4} style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700,fontSize:12}}>Four Boundaries of Property</td></tr>
          {[["East",v.eastDoc,v.east],["North",v.northDoc,v.north],["West",v.westDoc,v.west],["South",v.southDoc,v.south]].map(([d,doc,site])=>(
            <tr key={d}><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#f9f9f9"}}></td><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#fafafa",fontWeight:600,width:"28%",fontSize:11}}>{d}</td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontSize:12}}>{doc||"—"}</td><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#fafafa",fontWeight:600,width:"22%",fontSize:11}}>Actual at Site</td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontSize:12}}>{site||"—"}</td></tr>
          ))}
          <tr><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#f9f9f9"}}></td><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#fafafa",fontWeight:600,fontSize:11}}>Boundaries Matching</td><td colSpan={3} style={{border:"1px solid #ddd",padding:"5px 10px",fontSize:12}}>{v.boundariesMatching}</td></tr>
          <R num="4.2" label="Site Area (as per Document)" value={v.plotAreaDoc?v.plotAreaDoc+" sft":"—"} label2="Site Area at Site" value2={v.landArea?fmt(v.landArea)+" sft":"—"}/>
          <R num="4.3" label="Property Location" value={v.propertyAuth} label2="Distance from Branch" value2={v.distanceFromBranch?v.distanceFromBranch+" km":"—"}/>
          <R num="4.4" label="Type of Locality" value={v.typeOfLocality} label2="Class of Locality" value2={v.classOfLocality}/>
          <R num="4.5" label="Road Width &amp; Type" value={(v.roadWidth||"")+"ft @ "+v.roadFacing+" Side "+v.roadType} label2="Electricity / Water / Drainage" value2={v.electricityConnection+" / "+v.waterDrainage}/>
          <R num="4.6" label="Type of Property" value={v.propertyType} label2="Construction Type" value2={v.constructionType}/>
          <R num="4.7" label="Interior Quality" value={v.interiorQuality} label2="Exterior Quality" value2={v.exteriorQuality}/>
          <R num="4.8" label="Maintenance Level" value={v.maintenanceLevel} label2="Roof Type" value2={v.roofType}/>
          <R num="4.9" label="Age of Property" value={v.constructionAge?v.constructionAge+" Years":"—"} label2="Residual Age" value2={v.residualAge?v.residualAge+" Years":"—"}/>
          <R num="4.10" label="Risk of Demolition" value={v.riskOfDemolition} label2="Floor Finish" value2={v.floorType}/>
          <R num="4.11" label="Amenities" value={v.amenitiesDesc||"—"} label2="" value2=""/>
          {floorRows.length>0 && <>
            <tr><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#f9f9f9",textAlign:"center",fontWeight:600,fontSize:11}}>4.12</td><td colSpan={4} style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700,fontSize:12}}>Property Description (Floor-wise)</td></tr>
            {floorRows.map(([fl,ar])=><tr key={fl}><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#f9f9f9"}}></td><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#fafafa",fontWeight:600,fontSize:11}}>{fl}</td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontSize:12}}>{fmt(ar)} sft</td><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#fafafa",fontWeight:600,fontSize:11}}></td><td style={{border:"1px solid #ddd",padding:"5px 10px"}}></td></tr>)}
            <tr style={{background:"#e8f0fb"}}><td style={{border:"1px solid #ddd",padding:"5px 10px"}}></td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700,fontSize:11}}>Total BUA (Actual)</td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700}}>{fmt(totalActual)} sft</td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700,fontSize:11}}>As per FAR {v.farConsidered}</td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700}}>{fmt(v.builtUpAreaFAR)} sft</td></tr>
          </>}
        </tbody></table></>}
        {sec.occupancy && <><SH n="5">OCCUPANCY DETAILS</SH><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <R num="5.1" label="Status of Occupancy" value={v.occupancyStatus} label2="Occupied by" value2={v.occupiedBy}/>
          <R num="5.2" label="Relationship" value={v.occupancyRelation} label2="Occupied Since" value2={v.occupiedSince}/>
          <R num="5.3" label="Completion Status" value={v.completionStatus||"Completed"} label2="Rental Value" value2={v.rentalValue||"NA"}/>
        </tbody></table></>}
        {sec.violations && <><SH n="6">VIOLATIONS OBSERVED</SH><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <R num="6.1" label="Encroachment (Y/N)" value="NA" label2="Risk of Demolition" value2={v.riskOfDemolition}/>
          <R num="6.2" label="Deviation in Structure" value="NA" label2="Plans available (Y/N)" value2="NA"/>
        </tbody></table></>}
        {sec.valuation && <><SH n="7">VALUATION DETAILS</SH><table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <R num="7.1" label="Land Area" value={v.landArea?fmt(v.landArea)+" sft":"—"} label2="Land Rate (per sft)" value2={v.landRate?"Rs."+fmt(v.landRate)+"/-":"—"}/>
          <tr><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#f9f9f9",textAlign:"center",fontWeight:600,color:"#555",fontSize:11}}>7.A</td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700,fontSize:12}}>Land Value (A)</td><td colSpan={3} style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700,color:col||"#1f4e79"}}>{fmtRs(v.landValue||calc.landValue)}</td></tr>
          <R num="7.2" label="Permissible FAR" value={v.farPermitted} label2="FAR Considered" value2={v.farConsidered}/>
          <R num="7.3" label="BUA as per FAR" value={v.builtUpAreaFAR?fmt(v.builtUpAreaFAR)+" sft":"—"} label2="Construction Rate" value2={v.constructionRate?"Rs."+fmt(v.constructionRate)+"/-":"—"}/>
          {v.wardrobeValue && <R num="7.4" label="Ward Robes" value={fmtRs(v.wardrobeValue)} label2="Amenities" value2={fmtRs(v.amenitiesValue||"")}/>}
          <R num="7.5" label="Building Value (Before Dep.)" value={fmtRs(v.totalBuildingValueBeforeDep||calc.totalBuildingValueBeforeDep)} label2="Depreciation" value2={v.depreciationPct?v.depreciationPct+"% = "+fmtRs(v.depreciationValue||calc.depreciationValue):"—"}/>
          <tr><td style={{border:"1px solid #ddd",padding:"5px 10px",background:"#f9f9f9",textAlign:"center",fontWeight:600,color:"#555",fontSize:11}}>7.B</td><td style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700,fontSize:12}}>Building Value After Dep. (B)</td><td colSpan={3} style={{border:"1px solid #ddd",padding:"5px 10px",fontWeight:700,color:col||"#1f4e79"}}>{fmtRs(v.totalBuildingValueAfterDep||calc.totalBuildingValueAfterDep)}</td></tr>
        </tbody></table>
        <ValSummaryBox v={v} calc={calc} col={col}/>
        <div style={{marginTop:8}}/></>}
        {sec.comments && v.remarks && <><SH>REMARKS</SH><div style={{padding:"10px 16px",fontSize:12,lineHeight:1.8,background:"white",whiteSpace:"pre-line",marginBottom:2}}>{v.remarks}</div></>}
        {sec.photos && v.photos?.length>0 && <><SH>PROPERTY PHOTOGRAPHS</SH><div style={{padding:14}} className="rpt-photos">{v.photos.map(p=><div key={p.id} className="rpt-photo"><img src={p.url} alt={p.caption}/><div className="rpt-photo-cap">{p.caption||"Site Photo"}</div></div>)}</div></>}
        {sec.declaration && <div style={{padding:"0 18px 18px"}}><RptSigBlock v={v} sig={sig} sigFont={sigFont} sigColor={sigColor} col={col}/></div>}
      </div>
      <div style={{padding:"12px 18px",borderTop:"2px solid "+(col||"#1f4e79"),background:"#fafafa",fontSize:10,color:"#999"}}>{bank?.footerNote||"Fair market value indicated is an opinion of value prevailing on the date of inspection. Client is free to obtain independent opinions."}</div>
    </div>
  );
}

// ── 3. HINDUJA (Technical Scrutiny Report) ────────────────────────────────────
function HindujaReport({v, bank, col, sig, sigFont, sigColor}) {
  const calc = calcValuation(v);
  const floorRows = [["Ground Floor",v.gfArea],["First Floor",v.ffArea],["Second Floor",v.sfArea],["Third Floor",v.tfArea],["4th Floor",v.ff4Area],["5th Floor",v.ff5Area]].filter(([,a])=>a);
  const totalActual = totalFloorArea(v);
  const TR = ({n,label,value,label2,value2}) => (
    <tr>
      <td style={{border:"1px solid #bbb",padding:"5px 8px",textAlign:"center",fontWeight:700,color:"#555",background:"#f5f5f5",width:28,fontSize:11}}>{n}</td>
      <td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:600,color:"#333",background:"#fafafa",fontSize:11,width:"32%"}}>{label}</td>
      <td style={{border:"1px solid #bbb",padding:"5px 8px",fontSize:12}}>{value||""}</td>
      {label2!==undefined && <><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:600,color:"#333",background:"#fafafa",fontSize:11,width:"25%"}}>{label2}</td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontSize:12}}>{value2||""}</td></>}
    </tr>
  );
  const SH = ({letter,children}) => <tr><td colSpan={5} style={{background:col,color:"white",padding:"6px 10px",fontWeight:700,fontSize:12,letterSpacing:.5}}>{letter && <span style={{marginRight:8}}>{letter}.</span>}{children}</td></tr>;
  return (
    <div style={{padding:"24px 30px",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{border:"2px solid "+col,padding:"10px 14px",marginBottom:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
        <div><strong>Valuer Name:</strong> K.P. Satish Babu</div>
        <div><strong>Loan Type:</strong> {v.purpose||"LAP"}</div>
        <div><strong>Valuation Initiated by:</strong> {bank?.name||"Hinduja Leyland Finance"}</div>
        <div><strong>Date:</strong> {v.reportDate}</div>
        <div><strong>Contact Person Name:</strong> {v.personMetName||""}</div>
        <div><strong>Contact No.:</strong> {v.personMetPhone||""}</div>
      </div>
      <div style={{textAlign:"center",fontFamily:"'Playfair Display',serif",fontSize:16,color:col,fontWeight:700,marginBottom:14,borderBottom:"2px solid "+col,paddingBottom:8}}>Technical Scrutiny Report (TENTATIVE VALUE)</div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <tbody>
          <SH letter="A">GENERAL DETAILS</SH>
          <TR n="1" label="Name of the Applicant" value={v.customerName||v.ownerName} label2="Application No." value2={v.applicationNumber}/>
          <TR n="2" label="Property Owner Name" value={v.ownerName} label2="Contact" value2={v.ownerContact}/>
          <TR n="3" label="Address as per Document" value={v.legalAddress||v.surveyNo} label2="Address as per Site" value2={[v.propertyAddress,v.city,v.district,v.state].filter(Boolean).join(", ")}/>
          <TR n="4" label="Address Match" value={v.boundariesMatching||"—"} label2="Within Corporation Limit" value2={v.propertyAuth||"—"}/>
          <TR n="5" label="Person Met at Site" value={v.personMetName} label2="Phone" value2={v.personMetPhone}/>
          <TR n="6" label="Date of Visit" value={v.fieldEngineerDate} label2="Field Engineer" value2={v.fieldEngineerName}/>
          <TR n="7" label="In Demolition List" value="NA" label2="Risk of Demolition" value2={v.riskOfDemolition}/>

          <SH letter="B">DOCUMENT DETAILS</SH>
          <TR n="8" label="Sale Deed" value={v.documentsStudied||"Copy of Sale Deed"} label2="Ownership Proof" value2="Provided"/>
          <TR n="9" label="Approved Plan" value={v.buildingPlan} label2="Sanction Authority" value2={v.approvalAuthority||"NA"}/>
          <TR n="10" label="Layout Plan" value={v.layoutPlan} label2="Approval No. &amp; Date" value2={v.approvalNumber!=="NA"?v.approvalNumber+" / "+v.approvalDate:"NA"}/>
          <TR n="11" label="Construction Permission" value={v.constructionPermission} label2="Usage as per Plan" value2={v.propertyUsageDoc||"Residential"}/>
          <TR n="12" label="Compliance to Plan" value={deviationPct(v)===0||deviationPct(v)===null?"Yes — No deviation":"No — "+deviationPct(v)+"% deviation"} label2="" value2=""/>

          <SH letter="C">PROPERTY DETAILS</SH>
          <TR n="13" label="Occupancy (GF)" value={v.occupancyStatus} label2="Occupied by" value2={v.occupiedBy||v.occupancyRelation}/>
          <TR n="14" label="Property Type" value={v.propertyType} label2="Construction Type" value2={v.constructionType}/>
          <TR n="15" label="GPS Co-Ordinates" value={v.latitude&&v.longitude?v.latitude+", "+v.longitude:"—"} label2="Seismic Zone" value2={v.seismicZone}/>
          <TR n="16" label="Plot Demarcated" value={v.plotDemarcated} label2="Property Identifiable" value2="Yes"/>
          <TR n="17" label="Type of Locality" value={v.typeOfLocality} label2="Class" value2={v.classOfLocality}/>
          <TR n="18" label="Road Type &amp; Width" value={v.roadType+(v.roadWidth?" — "+v.roadWidth+"ft":"")} label2="Road Facing" value2={v.roadFacing}/>
          <TR n="19" label="Property Authority" value={v.propertyAuth} label2="Distance from Branch" value2={v.distanceFromBranch?v.distanceFromBranch+" km":"—"}/>
          <TR n="20" label="Electricity / Water" value={v.electricityConnection+" / "+v.waterDrainage} label2="" value2=""/>

          <SH letter="D">BOUNDARIES</SH>
          <tr><td style={{border:"1px solid #bbb",padding:"5px 8px",textAlign:"center",background:"#f5f5f5",fontWeight:700,fontSize:11}}></td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>Direction</td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>As per Document</td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>Direction</td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>Actual at Site</td></tr>
          {[["North",v.northDoc,v.north],["South",v.southDoc,v.south],["East",v.eastDoc,v.east],["West",v.westDoc,v.west]].map(([d,doc,site])=>(
            <tr key={d}><td style={{border:"1px solid #bbb",padding:"5px 8px",background:"#f5f5f5"}}></td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>{d}</td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontSize:12}}>{doc||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>{d}</td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontSize:12}}>{site||"—"}</td></tr>
          ))}

          <SH letter="E">BUILDING AND PROPERTY DETAILS</SH>
          <TR n="31" label="Plot Area (as per Document)" value={v.plotAreaDoc?v.plotAreaDoc+" sft":"—"} label2="Plot Area (at Site)" value2={v.landArea?fmt(v.landArea)+" sft":"—"}/>
          <TR n="32" label="No. of Floors" value={floorRows.length||"—"} label2="Construction Age" value2={v.constructionAge?v.constructionAge+" yrs":"—"}/>
          <TR n="33" label="Residual Age" value={v.residualAge?v.residualAge+" yrs":"—"} label2="Condition" value2={v.condition}/>
          <TR n="34" label="Roof Type" value={v.roofType} label2="Floor Finish" value2={v.floorType}/>
          <TR n="35" label="Wall" value={v.wallType} label2="Maintenance Level" value2={v.maintenanceLevel}/>
          <TR n="36" label="Interior Quality" value={v.interiorQuality} label2="Exterior Quality" value2={v.exteriorQuality}/>
          <TR n="37" label="Amenities" value={v.amenitiesDesc||"—"} label2="" value2=""/>
          {floorRows.length>0 && <>
            <tr><td colSpan={5} style={{background:"#f0f4fa",fontWeight:700,padding:"5px 10px",border:"1px solid #bbb",fontSize:11}}>Floor-wise Built-Up Areas</td></tr>
            {floorRows.map(([fl,ar])=><tr key={fl}><td style={{border:"1px solid #bbb",padding:"5px 8px",background:"#f5f5f5"}}></td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>{fl}</td><td colSpan={3} style={{border:"1px solid #bbb",padding:"5px 8px",fontSize:12}}>{fmt(ar)} sft</td></tr>)}
            <tr style={{background:"#e8f0fb"}}><td style={{border:"1px solid #bbb",padding:"5px 8px"}}></td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:700,fontSize:11}}>Total BUA</td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:700}}>{fmt(totalActual)} sft</td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:700,fontSize:11}}>FAR {v.farConsidered} = </td><td style={{border:"1px solid #bbb",padding:"5px 8px",fontWeight:700}}>{fmt(v.builtUpAreaFAR)} sft</td></tr>
          </>}
          <SH letter="F">NDMA PARAMETERS</SH>
          <TR n="—" label="Seismic Zone" value={v.seismicZone||v.ndmaSeismicZone||"Zone-2"} label2="Structure Type" value2={v.constructionType}/>
          <TR n="—" label="Roof Type" value={v.roofType} label2="Flood Prone Area" value2={v.floodProne||"No"}/>
          <TR n="—" label="Soil Type" value={v.soilType||"Hard Rock"} label2="Risk of Demolition" value2={v.riskOfDemolition}/>
          <SH letter="G">VALUATION</SH>
        </tbody>
      </table>
      <div style={{marginTop:8}}><ValSummaryBox v={v} calc={calc} col={col}/></div>
      {floorRows.length>0 && <div style={{marginTop:12}}><div style={{fontWeight:700,fontSize:12,color:col,marginBottom:6}}>Deviation Details</div><DevTable v={v}/></div>}
      {v.remarks && <div style={{marginTop:12,padding:"8px 12px",background:"#fafafa",border:"1px solid #ddd",borderRadius:4,fontSize:12,lineHeight:1.7,whiteSpace:"pre-line"}}><strong>Remarks:</strong><br/>{v.remarks}</div>}
      {v.photos?.length>0 && <div style={{marginTop:12}}><div style={{fontWeight:700,fontSize:12,color:col,marginBottom:6}}>Site Photographs</div><div className="rpt-photos">{v.photos.map(p=><div key={p.id} className="rpt-photo"><img src={p.url} alt={p.caption}/><div className="rpt-photo-cap">{p.caption||"Site Photo"}</div></div>)}</div></div>}
      <div style={{marginTop:14}}><RptSigBlock v={v} sig={sig} sigFont={sigFont} sigColor={sigColor} col={col}/></div>
    </div>
  );
}

// ── 4. INCRED (Technical Appraisal Report) ────────────────────────────────────
function IncredReport({v, bank, col, sig, sigFont, sigColor}) {
  const calc = calcValuation(v);
  const floorRows = [["Basement Floor",""],["Ground Floor",v.gfArea],["First Floor",v.ffArea],["Second Floor",v.sfArea],["Third Floor",v.tfArea]].filter(([fl,a])=>a);
  const totalActual = totalFloorArea(v);
  const Row2 = ({label,value,label2,value2}) => (
    <tr>
      <td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11,width:"30%"}}>{label}</td>
      <td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12,width:"20%"}}>{value||"—"}</td>
      <td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11,width:"30%"}}>{label2||""}</td>
      <td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{value2||""}</td>
    </tr>
  );
  const SH = ({children}) => <div style={{background:col,color:"white",padding:"5px 12px",fontWeight:700,fontSize:11,letterSpacing:.5,marginTop:10,marginBottom:4}}>{children}</div>;
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:col,color:"white",textAlign:"center",padding:"10px 20px"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700}}>Incred Financial Services Ltd.</div>
        <div style={{fontSize:12,marginTop:2,opacity:.85}}>Technical Appraisal Report</div>
      </div>
      <div style={{padding:"0 24px 24px"}}>
        <table style={{width:"100%",borderCollapse:"collapse",marginTop:12}}>
          <tbody>
            <Row2 label="Name and Code of Valuation Agency" value="K P Satish Babu" label2="Proposal No" value2={v.applicationNumber||"NA"}/>
            <Row2 label="Date of Inspection / Site Visit" value={v.fieldEngineerDate} label2="Name of Customer / Applicant" value2={v.customerName||v.ownerName}/>
            <Row2 label="Name of Current Owner / Seller" value={v.ownerName} label2="Name of Person Met at Site" value2={v.personMetName}/>
            <tr><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>Property Address (As per Docs)</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}} colSpan={1}>{v.legalAddress||"—"}</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>Property Address (Actual)</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{[v.propertyAddress,v.city,v.district,v.state,v.pincode].filter(Boolean).join(", ")}</td></tr>
            <tr><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>Documents Provided</td><td colSpan={3} style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.documentsStudied||"—"}</td></tr>
          </tbody>
        </table>

        <SH>PROPERTY DETAILS</SH>
        <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <Row2 label="Plot Demarcation (Yes/No)" value={v.plotDemarcated} label2="Property Identifiable" value2="Yes"/>
          <Row2 label="Occupation Status" value={v.occupancyStatus} label2="Property Usage as per Plan" value2={v.propertyUsageDoc}/>
          <Row2 label="Type of Structure" value={v.constructionType} label2="Within MC / DA / GP Limit" value2={v.propertyAuth}/>
          <Row2 label="Present Age of Property" value={v.constructionAge?v.constructionAge+" yrs":"—"} label2="Future Physical Life" value2={v.residualAge?v.residualAge+" yrs":"—"}/>
          <Row2 label="Type of Locality" value={v.typeOfLocality} label2="Class of Locality" value2={v.classOfLocality}/>
          <Row2 label="Property Usage at Site" value={v.propertyUsageSite||v.propertyType} label2="Marketability" value2={v.classOfLocality||"Good"}/>
        </tbody></table>

        <SH>BOUNDARIES &amp; ROAD DETAILS</SH>
        <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <tr><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11}} colSpan={1}>Boundaries</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#e8f0fb",fontSize:11}}>North</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#e8f0fb",fontSize:11}}>South</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#e8f0fb",fontSize:11}}>East</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#e8f0fb",fontSize:11}}>West</td></tr>
          <tr><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>As per Deed</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.northDoc||"—"}</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.southDoc||"—"}</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.eastDoc||"—"}</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.westDoc||"—"}</td></tr>
          <tr><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>As per Site / Actual</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.north||"—"}</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.south||"—"}</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.east||"—"}</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.west||"—"}</td></tr>
          <tr><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>Boundaries Matching</td><td colSpan={4} style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{v.boundariesMatching}</td></tr>
          <Row2 label="Road (GP/District/SH/NH)" value={v.roadType} label2="Road Width" value2={v.roadWidth?v.roadWidth+"ft":"—"}/>
          <Row2 label="Type of Approach Road" value={v.roadFacing+" facing, "+v.roadType} label2="Is property under road widening" value2="NA"/>
        </tbody></table>

        <SH>BUILT-UP AREA &amp; ACCOMMODATION DETAILS</SH>
        <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <tr style={{background:col,color:"white"}}><td style={{padding:"4px 8px",fontWeight:600,fontSize:11}}>Floor</td><td style={{padding:"4px 8px",fontWeight:600,fontSize:11}}>Accommodation</td><td style={{padding:"4px 8px",fontWeight:600,fontSize:11}}>Carpet Area (sft)</td><td style={{padding:"4px 8px",fontWeight:600,fontSize:11}}>Actual BUA/SBUA (sft)</td></tr>
          {[["Basement","",""],["Ground Floor",v.gfArea,v.gfArea],["First Floor",v.ffArea,v.ffArea],["Second Floor",v.sfArea,v.sfArea],["Third Floor",v.tfArea,v.tfArea]].map(([fl,ca,bua])=>(
            <tr key={fl}><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:600,background:"#fafafa",fontSize:11}}>{fl}</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}></td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{ca?fmt(ca)+" sft":""}</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontSize:12}}>{bua?fmt(bua)+" sft":""}</td></tr>
          ))}
          <tr style={{background:"#e8f0fb"}}><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:700,fontSize:11}}>Total</td><td style={{border:"1px solid #bbb",padding:"4px 8px"}}></td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:700}}>{fmt(totalActual)} sft</td><td style={{border:"1px solid #bbb",padding:"4px 8px",fontWeight:700}}>{fmt(v.builtUpAreaFAR||totalActual)} sft</td></tr>
        </tbody></table>

        <SH>NDMA PARAMETERS</SH>
        <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <Row2 label="Nature of Building" value="Residential" label2="Structure Type" value2={v.constructionType}/>
          <Row2 label="Seismic Zone" value={v.seismicZone||"Zone-2"} label2="Soil Liquefiable" value2="No"/>
          <Row2 label="Roof Type" value={v.roofType} label2="Flood Prone Area" value2={v.floodProne||"No"}/>
          <Row2 label="Ground Slope" value="Less than 15%" label2="Coastal Regulatory Zone" value2="No"/>
        </tbody></table>

        <SH>PLAN APPROVALS</SH>
        <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
          <Row2 label="Building Plan Applicable" value={v.buildingPlan} label2="Competent Authority" value2={v.approvalAuthority||"NA"}/>
          <Row2 label="Approved Plan Number" value={v.approvalNumber||"NA"} label2="Approval Date" value2={v.approvalDate||"NA"}/>
          <Row2 label="Construction Permission" value={v.constructionPermission} label2="Layout Plan" value2={v.layoutPlan}/>
        </tbody></table>

        <SH>VALUATION</SH>
        <ValSummaryBox v={v} calc={calc} col={col}/>

        {v.remarks && <div style={{marginTop:10,padding:"8px 12px",background:"#fafafa",border:"1px solid #ddd",borderRadius:4,fontSize:12,lineHeight:1.7,whiteSpace:"pre-line"}}><strong>Remarks:</strong><br/>{v.remarks}</div>}
        {v.photos?.length>0 && <div style={{marginTop:10}}><div style={{fontWeight:700,fontSize:12,color:col,marginBottom:6}}>Site Photographs</div><div className="rpt-photos">{v.photos.map(p=><div key={p.id} className="rpt-photo"><img src={p.url} alt={p.caption}/><div className="rpt-photo-cap">{p.caption||"Site Photo"}</div></div>)}</div></div>}
        <div style={{marginTop:14}}><RptSigBlock v={v} sig={sig} sigFont={sigFont} sigColor={sigColor} col={col}/></div>
      </div>
    </div>
  );
}

// ── 5. RELIGARE (Land & Building Analysis) ────────────────────────────────────
function ReligareReport({v, bank, col, sig, sigFont, sigColor}) {
  const calc = calcValuation(v);
  const floorRows = [["Ground Floor",v.gfArea],["First Floor",v.ffArea],["Second Floor",v.sfArea],["Third Floor",v.tfArea],["4th Floor",v.ff4Area],["5th Floor",v.ff5Area]].filter(([,a])=>a);
  const totalActual = totalFloorArea(v);
  const SH = ({children}) => <div style={{background:col,color:"white",padding:"6px 14px",fontWeight:700,fontSize:12,margin:"10px 0 5px"}}>{children}</div>;
  const Row = ({label,value,label2,value2}) => (
    <tr>
      <td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11,width:"32%"}}>{label}</td>
      <td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{value||"—"}</td>
      {label2!==undefined&&<><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11,width:"25%"}}>{label2}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{value2||"—"}</td></>}
    </tr>
  );
  return (
    <div style={{padding:"24px 30px",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"2px solid "+col,paddingBottom:10}}>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:col}}>K P Satish Babu</div>
          <div style={{fontSize:10,color:"#555",lineHeight:1.5}}>B.E (Civil) AMIE | Registered Valuer &amp; Chartered Engineer<br/>Mob: 9986509950 / 9845035535 | Bangalore – 560070</div>
          <div style={{fontSize:10,marginTop:4}}><strong>Valuation Agency:</strong> K.P. Satish Babu &nbsp;|&nbsp; <strong>Contact:</strong> 9845035535</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:col}}>{bank?.reportTitle||"PROPERTY APPRAISAL REPORT"}</div>
          <div style={{fontSize:10,color:"#777",marginTop:2}}>{bank?.name}{bank?.branch?" — "+bank.branch:""}</div>
          {v.applicationNumber && <div style={{fontSize:10,color:"#777"}}>CAS ID: {v.applicationNumber}</div>}
          <div style={{fontSize:10,color:"#777"}}>Date of Visit: {v.fieldEngineerDate} &nbsp;|&nbsp; Date of Submit: {v.reportDate}</div>
          <div style={{fontSize:10,color:"#777"}}>Engineer: {v.fieldEngineerName||"K P Satish Babu"}</div>
        </div>
      </div>
      <SH>GENERAL PROPERTY DETAILS</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <Row label="CAS ID / Application No." value={v.applicationNumber} label2="Case Type" value2={v.purpose||"LAP"}/>
        <Row label="Date of Inspection" value={v.fieldEngineerDate} label2="Nearest Landmark" value2={v.nearbyLandmark}/>
        <Row label="Name of Customer / Applicant" value={v.customerName||v.ownerName} label2="Contact" value2={v.ownerContact}/>
        <Row label="Name of Current Owner" value={v.ownerName} label2="Person Met at Site" value2={v.personMetName}/>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>Address as per RFL</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.legalAddress||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>Address as per Site</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{[v.propertyAddress,v.city,v.district,v.state,v.pincode].filter(Boolean).join(", ")}</td></tr>
        <Row label="Type of Property" value={v.propertyType} label2="Property Usage" value2={v.propertyUsageSite||v.propertyType}/>
        <Row label="Type of Locality" value={v.typeOfLocality} label2="Latitude &amp; Longitude" value2={v.latitude&&v.longitude?v.latitude+", "+v.longitude:"—"}/>
        <Row label="Within MC / GP Limit" value={v.propertyAuth} label2="Road Access" value2={v.roadType+(v.roadWidth?" — "+v.roadWidth+"ft":"")}/>
      </tbody></table>
      <SH>LAND PERSPECTIVE DETAILS</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <Row label="Land Area" value={v.landArea?fmt(v.landArea)+" sft":"—"} label2="Land Ownership" value2="Freehold"/>
        <Row label="Plot Demarcated" value={v.plotDemarcated} label2="Property Identifiable" value2="Yes"/>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>Boundaries</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700,color:"#555",fontSize:11}} colSpan={3}></td></tr>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>As per Documents</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>N: {v.northDoc||"—"} | S: {v.southDoc||"—"} | E: {v.eastDoc||"—"} | W: {v.westDoc||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>As per Site</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>N: {v.north||"—"} | S: {v.south||"—"} | E: {v.east||"—"} | W: {v.west||"—"}</td></tr>
        <Row label="Boundary Mismatch" value={v.boundariesMatching==="Yes"?"Nil":"Present"} label2="Seismic Zone" value2={v.seismicZone}/>
      </tbody></table>
      <SH>BUILDING PERSPECTIVE DETAILS</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <Row label="Construction Type" value={v.constructionType} label2="Age of Property" value2={v.constructionAge?v.constructionAge+" Years":"—"}/>
        <Row label="Residual Age" value={v.residualAge?v.residualAge+" Years":"—"} label2="Condition" value2={v.condition}/>
        <Row label="Roof Type" value={v.roofType} label2="Floor Finish" value2={v.floorType}/>
        <Row label="Interior Quality" value={v.interiorQuality} label2="Exterior Quality" value2={v.exteriorQuality}/>
        <Row label="Maintenance Level" value={v.maintenanceLevel} label2="Risk of Demolition" value2={v.riskOfDemolition}/>
        <Row label="Amenities" value={v.amenitiesDesc||"—"} label2="" value2=""/>
        {floorRows.length>0 && <>
          <tr><td colSpan={4} style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700,background:"#f0f4fa",fontSize:11}}>Built-up Area, Accommodation &amp; Deviation Details</td></tr>
          {floorRows.map(([fl,ar])=><Row key={fl} label={fl} value={fmt(ar)+" sft"} label2="" value2=""/>)}
          <tr style={{background:"#e8f0fb"}}><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700,fontSize:11}}>Total BUA (Actual)</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700}}>{fmt(totalActual)} sft</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700,fontSize:11}}>As per FAR {v.farConsidered}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700}}>{fmt(v.builtUpAreaFAR)} sft</td></tr>
          <Row label="Deviation %" value={deviationPct(v)!=null?deviationPct(v)+"%":"NA"} label2="Plan Approval" value2={v.buildingPlan}/>
        </>}
        <Row label="Layout Plan" value={v.layoutPlan} label2="Approval Authority" value2={v.approvalAuthority}/>
        <Row label="Occupancy Status" value={v.occupancyStatus} label2="Occupied by" value2={v.occupiedBy||v.occupancyRelation}/>
      </tbody></table>
      <SH>FAIR MARKET VALUE ANALYSIS — LAND &amp; BUILDING METHOD</SH>
      <ValSummaryBox v={v} calc={calc} col={col}/>
      {v.compositeRate && (
        <>
          <SH>COMPOSITE RATE METHOD (per sft)</SH>
          <div style={{background:"linear-gradient(135deg,"+col+","+col+"99)",color:"white",borderRadius:6,padding:"12px 16px",marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,.2)",fontSize:12}}><span>Total BUA</span><span>{fmt(totalActual)} sft</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,.2)",fontSize:12}}><span>Composite Rate (Rs./sft)</span><span>Rs.{fmt(v.compositeRate)}</span></div>
            <div style={{background:"#c9921a",borderRadius:5,padding:"7px 12px",marginTop:7,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:13}}><span>Value by Composite Rate</span><span>{fmtRs(v.compositeValue||Math.round(totalActual*parseFloat(v.compositeRate||0)).toString())}</span></div>
          </div>
        </>
      )}
      {v.govtGuidelineRate && (
        <>
          <SH>VALUATION AS PER GOVERNMENT GUIDELINE RATE</SH>
          <div style={{background:"#f5f5f5",border:"1px solid #ddd",borderRadius:6,padding:"10px 14px",fontSize:12}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Govt. Guideline Rate (Rs./sft)</span><span>{fmt(v.govtGuidelineRate)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Land Value as per Guideline</span><span style={{fontWeight:700}}>{fmtRs(v.govtGuidelineValue||Math.round(parseFloat(v.landArea||0)*parseFloat(v.govtGuidelineRate||0)).toString())}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Distress Value (70–80% of FMV)</span><span style={{fontWeight:700}}>{fmtRs(v.distressedValue||calc.distressedValue)}</span></div>
          </div>
        </>
      )}
      {v.remarks && <><SH>CRITICAL REMARKS ON THE PROPERTY &amp; VALUATION</SH><div style={{padding:"8px 12px",background:"#fafafa",border:"1px solid #ddd",borderRadius:4,fontSize:12,lineHeight:1.7,whiteSpace:"pre-line"}}>{v.remarks}</div></>}
      {v.photos?.length>0 && <><SH>PROPERTY PHOTOGRAPHS</SH><div className="rpt-photos">{v.photos.map(p=><div key={p.id} className="rpt-photo"><img src={p.url} alt={p.caption}/><div className="rpt-photo-cap">{p.caption||"Site Photo"}</div></div>)}</div></>}
      <div style={{marginTop:14}}><RptSigBlock v={v} sig={sig} sigFont={sigFont} sigColor={sigColor} col={col}/></div>
    </div>
  );
}

// ── 6. ORIX (Letter-Section Table) ────────────────────────────────────────────
function OrixReport({v, bank, col, sig, sigFont, sigColor}) {
  const calc = calcValuation(v);
  const floorRows = [["Ground Floor",v.gfArea],["First Floor",v.ffArea],["Second Floor",v.sfArea],["Third Floor",v.tfArea],["4th Floor",v.ff4Area],["5th Floor",v.ff5Area]].filter(([,a])=>a);
  const totalActual = totalFloorArea(v);
  const Row = ({n,label,value}) => (
    <tr>
      <td style={{border:"1px solid #bbb",padding:"5px 9px",textAlign:"center",fontWeight:600,background:"#f5f5f5",width:24,fontSize:11}}>{n}</td>
      <td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11,width:"38%"}}>{label}</td>
      <td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}} colSpan={2}>{value||""}</td>
    </tr>
  );
  const SH = ({letter,children}) => <tr><td style={{background:col,color:"white",padding:"6px 10px",fontWeight:700,fontSize:12,letterSpacing:.4}} colSpan={4}>{letter && <span style={{background:"rgba(255,255,255,.25)",borderRadius:3,padding:"1px 7px",marginRight:8,fontWeight:900}}>{letter}</span>}{children}</td></tr>;
  return (
    <div style={{padding:"24px 30px",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{border:"2px solid "+col,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:col}}>K P Satish Babu</div>
          <div style={{fontSize:10,color:"#555",lineHeight:1.5}}>B.E (Civil) AMIE | Registered Valuer &amp; Chartered Engineer<br/>Mob: 9986509950 / 9845035535</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:col}}>{bank?.reportTitle||"VALUATION REPORT"}</div>
          <div style={{fontSize:10,color:"#777"}}>Ref No – KPS &nbsp;|&nbsp; {bank?.name||""}</div>
          <div style={{fontSize:10,color:"#777"}}>Date: {v.reportDate}</div>
        </div>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <tbody>
          <SH letter="A">GENERAL DETAILS</SH>
          <Row n="1" label="Name of the Customer(s)" value={v.customerName||v.ownerName}/>
          <Row n="2" label="Property Address" value={[v.propertyAddress,v.city,v.district,v.state,v.pincode].filter(Boolean).join(", ")}/>
          <Row n="3" label="Landmark" value={v.nearbyLandmark}/>
          <Row n="4" label="Loan Application Number" value={v.applicationNumber}/>
          <Row n="5" label="Name of Document Holder" value={v.ownerName}/>
          <Row n="6" label="Legal Address (Survey / Khatha No.)" value={v.legalAddress||v.surveyNo}/>
          <Row n="7" label="Date of Inspection" value={v.fieldEngineerDate}/>
          <SH letter="B">SURROUNDING LOCALITY DETAILS</SH>
          <Row n="1" label="Property Authority / Ward No." value={v.propertyAuth}/>
          <Row n="2" label="Vicinity / Neighbourhood" value={v.typeOfLocality+" — "+v.classOfLocality}/>
          <Row n="3" label="Road Type / Width" value={v.roadType+(v.roadWidth?" — "+v.roadWidth+"ft":"")}/>
          <Row n="4" label="Electricity / Water / Drainage" value={v.electricityConnection+" / "+v.waterDrainage}/>
          <Row n="5" label="GPS Co-Ordinates" value={v.latitude&&v.longitude?v.latitude+", "+v.longitude+"E":"—"}/>
          <Row n="6" label="Seismic Zone" value={v.seismicZone}/>
          <SH letter="C">BOUNDARY DETAILS</SH>
          <tr>
            <td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#f5f5f5",fontWeight:600,fontSize:11}}></td>
            <td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#fafafa",fontWeight:600,fontSize:11}}>Direction</td>
            <td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>As per Document</td>
            <td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>Actual at Site</td>
          </tr>
          {[["North",v.northDoc,v.north],["South",v.southDoc,v.south],["East",v.eastDoc,v.east],["West",v.westDoc,v.west]].map(([d,doc,site])=>(
            <tr key={d}><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#f5f5f5"}}></td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,fontSize:11,background:"#fafafa"}}>{d}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{doc||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{site||"—"}</td></tr>
          ))}
          <Row n="—" label="Boundaries Matching" value={v.boundariesMatching}/>
          <Row n="—" label="Plot Area as per Document" value={v.plotAreaDoc?v.plotAreaDoc+" sft":"—"}/>
          <Row n="—" label="Plot Area at Site" value={v.landArea?fmt(v.landArea)+" sft":"—"}/>
          <SH letter="D">PROPERTY AND CONSTRUCTION DETAILS</SH>
          <Row n="1" label="Type of Property" value={v.propertyType}/>
          <Row n="2" label="Construction Type" value={v.constructionType}/>
          <Row n="3" label="Age of Property / Residual Age" value={(v.constructionAge||"—")+" yrs / "+(v.residualAge||"—")+" yrs"}/>
          <Row n="4" label="Condition" value={v.condition}/>
          <Row n="5" label="Interior / Exterior" value={v.interiorQuality+" / "+v.exteriorQuality}/>
          <Row n="6" label="Roof Type" value={v.roofType}/>
          <Row n="7" label="Floor Finish" value={v.floorType}/>
          <Row n="8" label="Maintenance" value={v.maintenanceLevel}/>
          <Row n="9" label="Amenities" value={v.amenitiesDesc||"—"}/>
          <SH letter="E">CONSTRUCTION QUALITY</SH>
          <Row n="1" label="Interior Finishing" value={v.interiorQuality}/>
          <Row n="2" label="Roofing and Terracing" value={v.roofType}/>
          <Row n="3" label="Quality of Fixtures &amp; Fittings" value={v.floorType}/>
          <SH letter="F">FLOOR-WISE AREA DETAILS</SH>
          {floorRows.length>0 ? <>
            {floorRows.map(([fl,ar])=><Row key={fl} n="—" label={fl} value={fmt(ar)+" sft"}/>)}
            <tr style={{background:"#e8f0fb"}}><td style={{border:"1px solid #bbb",padding:"5px 9px"}}></td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700,fontSize:11}}>Total BUA (Actual)</td><td colSpan={2} style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700}}>{fmt(totalActual)} sft &nbsp;|&nbsp; FAR {v.farConsidered}: {fmt(v.builtUpAreaFAR)} sft</td></tr>
          </> : <Row n="—" label="No floors recorded" value=""/>}
          <SH letter="G">PLAN APPROVALS</SH>
          <Row n="1" label="Construction as per Approved Plan" value="NA"/>
          <Row n="2" label="Approved Plan / Approval Number" value={v.approvalNumber!=="NA"?v.approvalNumber+" / "+v.approvalDate:"NA"}/>
          <Row n="3" label="Construction Permission Number" value={v.approvalNumber!=="NA"?v.approvalNumber:"NA"}/>
          <Row n="4" label="Violations Observed" value={deviationPct(v)&&deviationPct(v)>0?deviationPct(v)+"% deviation":"No"}/>
          <SH letter="H">VALUATION</SH>
          <Row n="1" label="Land Area (as per Document)" value={v.plotAreaDoc?v.plotAreaDoc+" sft":"—"}/>
          <Row n="2" label="Land Rate (Rs./sft)" value={v.landRate?"Rs."+fmt(v.landRate)+"/-":"—"}/>
          <Row n="3" label="Land Value (A)" value={fmtRs(v.landValue||calc.landValue)}/>
          <Row n="4" label="BUA as per FAR" value={v.builtUpAreaFAR?fmt(v.builtUpAreaFAR)+" sft":"—"}/>
          <Row n="5" label="Construction Rate (Rs./sft)" value={v.constructionRate?"Rs."+fmt(v.constructionRate)+"/-":"—"}/>
          <Row n="6" label="Depreciation" value={v.depreciationPct?v.depreciationPct+"%":"—"}/>
          <Row n="7" label="Building Value After Dep. (B)" value={fmtRs(v.totalBuildingValueAfterDep||calc.totalBuildingValueAfterDep)}/>
        </tbody>
      </table>
      <div style={{marginTop:8}}><ValSummaryBox v={v} calc={calc} col={col}/></div>
      {v.remarks && <div style={{marginTop:10,padding:"8px 12px",background:"#fafafa",border:"1px solid #ddd",borderRadius:4,fontSize:12,lineHeight:1.7,whiteSpace:"pre-line"}}><strong>Remarks:</strong><br/>{v.remarks}</div>}
      {v.photos?.length>0 && <div style={{marginTop:10}}><div style={{fontWeight:700,fontSize:12,color:col,marginBottom:6}}>Property Photographs</div><div className="rpt-photos">{v.photos.map(p=><div key={p.id} className="rpt-photo"><img src={p.url} alt={p.caption}/><div className="rpt-photo-cap">{p.caption||"Site Photo"}</div></div>)}</div></div>}
      <div style={{marginTop:14}}><RptSigBlock v={v} sig={sig} sigFont={sigFont} sigColor={sigColor} col={col}/></div>
    </div>
  );
}

// ── 7. ARKA (A–J Sections) ────────────────────────────────────────────────────
function ArkaReport({v, bank, col, sig, sigFont, sigColor}) {
  const calc = calcValuation(v);
  const floorRows = [["Ground Floor",v.gfArea],["First Floor",v.ffArea],["Second Floor",v.sfArea],["Third Floor",v.tfArea],["4th Floor",v.ff4Area],["5th Floor",v.ff5Area]].filter(([,a])=>a);
  const totalActual = totalFloorArea(v);
  const Row = ({label,value,label2,value2}) => (
    <tr>
      <td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11,width:"30%"}}>{label}</td>
      <td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{value||"—"}</td>
      {label2!==undefined&&<><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11,width:"25%"}}>{label2}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{value2||"—"}</td></>}
    </tr>
  );
  const SH = ({letter,children}) => <div style={{background:col,color:"white",padding:"6px 12px",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:8,margin:"10px 0 4px"}}>{letter && <span style={{background:"rgba(255,255,255,.3)",borderRadius:4,padding:"1px 8px",fontWeight:900}}>{letter}</span>}{children}</div>;
  return (
    <div style={{padding:"24px 30px",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:12,alignItems:"start",borderBottom:"2px solid "+col,paddingBottom:12,marginBottom:12}}>
        <div style={{textAlign:"center",padding:"8px 14px",background:col,color:"white",borderRadius:6}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700}}>K P Satish Babu</div>
          <div style={{fontSize:9,opacity:.85,marginTop:2,lineHeight:1.5}}>Registered Valuer &amp; Chartered Engineer<br/>Bangalore – 560070</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:col}}>{bank?.reportTitle||"TECHNICAL APPRAISAL REPORT"}</div>
            <div style={{fontSize:10,color:"#777"}}>{bank?.name}{bank?.branch?" — "+bank.branch:""}</div>
          </div>
          <div style={{textAlign:"right",fontSize:10,color:"#777"}}>
            <div>Date of Valuation: {v.reportDate}</div>
            {v.applicationNumber&&<div>Proposal No: {v.applicationNumber}</div>}
          </div>
        </div>
      </div>
      <SH letter="A">TECHNICAL INITIATION REQUEST DATA</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <Row label="Proposal No / Application ID" value={v.applicationNumber||"NA"} label2="Date of Inspection" value2={v.fieldEngineerDate}/>
        <Row label="Name of Customer / Applicant" value={v.customerName||v.ownerName} label2="Contact" value2={v.ownerContact}/>
        <Row label="Name of Current Owner / Seller" value={v.ownerName} label2="Person Met at Site" value2={v.personMetName}/>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>Address as per Document</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.legalAddress||v.surveyNo||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>Address as per Site</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{[v.propertyAddress,v.city,v.district,v.state,v.pincode].filter(Boolean).join(", ")}</td></tr>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>Documents Provided</td><td colSpan={3} style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.documentsStudied||"—"}</td></tr>
      </tbody></table>
      <SH letter="B">LOCATIONAL &amp; PROPERTY SPECIFIC DETAILS</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <Row label="Status of Land Holding" value="Freehold" label2="Type of Locality" value2={v.typeOfLocality}/>
        <Row label="Type of Property" value={v.propertyType} label2="Occupation Status" value2={v.occupancyStatus}/>
        <Row label="Property Usage" value={v.propertyUsageSite||v.propertyType} label2="Property Identifiable" value2="Yes"/>
        <Row label="Location / Zoning" value={v.propertyAuth} label2="Within MC / GP Limit" value2={v.propertyAuth}/>
        <Row label="Plot Demarcation" value={v.plotDemarcated} label2="Distance from City Centre" value2={v.distanceFromBranch?v.distanceFromBranch+" km":"—"}/>
        <Row label="Quality of Construction" value={v.condition} label2="Locality Type" value2={v.classOfLocality}/>
        <Row label="Internal Finishing" value={v.interiorQuality} label2="Type of Structure" value2={v.constructionType}/>
        <Row label="Risk of Demolition" value={v.riskOfDemolition} label2="Marketability" value2={v.classOfLocality||"Good"}/>
        <Row label="No. of Floors" value={floorRows.length||"—"} label2="Year of Completion" value2={v.constructionAge?new Date().getFullYear()-parseInt(v.constructionAge||0):""+" (est.)"}/>
      </tbody></table>
      <SH letter="C">BOUNDARIES</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#fafafa",fontWeight:600,fontSize:11}}></td><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>North</td><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>South</td><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>East</td><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>West</td></tr>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>As per Documents</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.northDoc||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.southDoc||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.eastDoc||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.westDoc||"—"}</td></tr>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>As per Site / Actual</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.north||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.south||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.east||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.west||"—"}</td></tr>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>Boundaries Matching</td><td colSpan={4} style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.boundariesMatching}</td></tr>
      </tbody></table>
      <SH letter="D">SETBACKS / MARGINS</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#fafafa",fontWeight:600,fontSize:11}}>Setback Type</td><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>Front</td><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>Rear</td><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>Left Side</td><td style={{border:"1px solid #bbb",padding:"5px 9px",background:"#e8f0fb",fontWeight:600,fontSize:11}}>Right Side</td></tr>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>As per Bylaws</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>—</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>—</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>—</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>—</td></tr>
        <tr><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>As per Site / Actual</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.frontSetback||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.rearSetback||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.leftSetback||"—"}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{v.rightSetback||"—"}</td></tr>
      </tbody></table>
      <SH letter="E">HEIGHT / STOREYS</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <Row label="No. of Floors" value={floorRows.length||"—"} label2="Building Height" value2={v.buildingHeight||"—"}/>
        <Row label="Floor Height" value={v.floorHeight||"—"} label2="Seismic Zone" value2={v.seizmicZone||"Zone-2"}/>
      </tbody></table>
      <SH letter="F">BUILT-UP AREA DETAILS</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <tr style={{background:col,color:"white"}}><td style={{padding:"4px 9px",fontWeight:600,fontSize:11}}>Floor</td><td style={{padding:"4px 9px",fontWeight:600,fontSize:11}}>Carpet Area (sft)</td><td style={{padding:"4px 9px",fontWeight:600,fontSize:11}}>Built-Up Area (sft)</td><td style={{padding:"4px 9px",fontWeight:600,fontSize:11}}>Usage</td></tr>
        {[["Ground Floor",v.gfArea],["First Floor",v.ffArea],["Second Floor",v.sfArea],["Third Floor",v.tfArea],["4th Floor",v.ff4Area],["5th Floor",v.ff5Area]].map(([fl,ar])=>(
          <tr key={fl}><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:600,background:"#fafafa",fontSize:11}}>{fl}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{ar?fmt(ar)+" sft":""}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}>{ar?fmt(ar)+" sft":""}</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontSize:12}}></td></tr>
        ))}
        <tr style={{background:"#e8f0fb"}}><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700,fontSize:11}}>Total</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700}}>{fmt(totalActual)} sft</td><td style={{border:"1px solid #bbb",padding:"5px 9px",fontWeight:700}}>{fmt(v.builtUpAreaFAR||totalActual)} sft (FAR {v.farConsidered})</td><td style={{border:"1px solid #bbb",padding:"5px 9px",color:deviationPct(v)>0?"#dc3545":"inherit",fontWeight:700}}>{deviationPct(v)!=null?deviationPct(v)+"% deviation":"—"}</td></tr>
      </tbody></table>
      <SH letter="G">PLAN APPROVALS</SH>
      <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
        <Row label="Construction as per Approved Plan" value="NA" label2="Construction Permission No. &amp; Date" value2={v.approvalNumber!=="NA"?v.approvalNumber+" / "+v.approvalDate:"NA"}/>
        <Row label="Layout Plan (Y/N)" value={v.layoutPlan} label2="Building Plan (Y/N)" value2={v.buildingPlan}/>
        <Row label="Approval Authority" value={v.approvalAuthority||"NA"} label2="" value2=""/>
      </tbody></table>
      <SH letter="I">VALUATION DETAILS</SH>
      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:8}}><tbody>
        <Row label="Recommended Land Rate (Rs/sft)" value={v.landRate?"Rs."+fmt(v.landRate)+"/-":"—"} label2="Total Land Value" value2={fmtRs(v.landValue||calc.landValue)}/>
        <Row label="BUA as per FAR" value={v.builtUpAreaFAR?fmt(v.builtUpAreaFAR)+" sft":"—"} label2="Construction Rate (Rs/sft)" value2={v.constructionRate?"Rs."+fmt(v.constructionRate)+"/-":"—"}/>
        {v.wardrobeValue&&<Row label="Ward Robes" value={fmtRs(v.wardrobeValue)} label2="Amenities" value2={fmtRs(v.amenitiesValue||"")}/>}
        <Row label="Building Value Before Dep." value={fmtRs(v.totalBuildingValueBeforeDep||calc.totalBuildingValueBeforeDep)} label2="Depreciation" value2={v.depreciationPct?v.depreciationPct+"%":"—"}/>
        <Row label="Building Value After Dep." value={fmtRs(v.totalBuildingValueAfterDep||calc.totalBuildingValueAfterDep)} label2="Govt. Guideline Rate" value2={v.govtGuidelineRate?"Rs."+fmt(v.govtGuidelineRate)+"/sft":"NA"}/>
      </tbody></table>
      <ValSummaryBox v={v} calc={calc} col={col}/>
      {v.remarks && <><SH letter="J">PROPERTY SPECIFIC REMARKS &amp; OBSERVATIONS</SH><div style={{padding:"8px 12px",background:"#fafafa",border:"1px solid #ddd",borderRadius:4,fontSize:12,lineHeight:1.7,whiteSpace:"pre-line"}}>{v.remarks}</div></>}
      {v.photos?.length>0 && <div style={{marginTop:10}}><div style={{fontWeight:700,fontSize:12,color:col,marginBottom:6}}>Property Photographs</div><div className="rpt-photos">{v.photos.map(p=><div key={p.id} className="rpt-photo"><img src={p.url} alt={p.caption}/><div className="rpt-photo-cap">{p.caption||"Site Photo"}</div></div>)}</div></div>}
      <div style={{marginTop:14}}><RptSigBlock v={v} sig={sig} sigFont={sigFont} sigColor={sigColor} col={col}/></div>
    </div>
  );
}

// ── Report Dispatcher ──────────────────────────────────────────────────────────
function ReportBody({v, bank, col, sig, sigFont, sigColor}) {
  const t = bank?.reportTemplate||"sectional";
  const p = {v, bank, col, sig, sigFont, sigColor};
  if (t==="tabular")  return <TabularReport  {...p}/>;
  if (t==="hinduja")  return <HindujaReport  {...p}/>;
  if (t==="incred")   return <IncredReport   {...p}/>;
  if (t==="religare") return <ReligareReport {...p}/>;
  if (t==="orix")     return <OrixReport     {...p}/>;
  if (t==="arka")     return <ArkaReport     {...p}/>;
  return <SectionalReport {...p}/>;
}

// ─── BankModal ─────────────────────────────────────────────────────────────────
function BankModal({bank, onSave, onClose}) {
  const [b, setB] = useState(bank ? {...bank, sections:{...bank.sections}} : defaultBank());
  const upd = (k,val) => setB(x=>({...x,[k]:val}));
  const toggleSec = (k) => setB(x=>({...x,sections:{...x.sections,[k]:!x.sections[k]}}));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><div className="modal-title">{bank?"Configure":"Add New"} Bank / Client</div><button className="modal-close" onClick={onClose}>x</button></div>
        <div className="modal-body" style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div className="field s2"><label>Bank / Client Name</label><input value={b.name} onChange={e=>upd("name",e.target.value)} placeholder="e.g. IndusInd Bank" /></div>
            <div className="field"><label>Branch</label><input value={b.branch} onChange={e=>upd("branch",e.target.value)} /></div>
            <div className="field"><label>Report Title</label><input value={b.reportTitle} onChange={e=>upd("reportTitle",e.target.value)} /></div>
          </div>
          <div><div style={{fontSize:11,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>Card Colour</div><div className="color-picker">{BANK_COLORS.map(c=><div key={c} className={"color-dot"+(b.color===c?" sel":"")} style={{background:c}} onClick={()=>upd("color",c)}/>)}</div></div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>Report Format</div>
            <div className="template-pick">
              {TEMPLATES.map(t=>(
                <div key={t.id} className={"tmpl-opt"+(b.reportTemplate===t.id?" sel":"")} onClick={()=>upd("reportTemplate",t.id)}>
                  <div className="tmpl-opt-title">{t.label}</div>
                  <div className="tmpl-opt-sub">{t.sub}</div>
                </div>
              ))}
            </div>
          </div>
          <div><div style={{fontSize:11,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",marginBottom:5}}>Report Sections</div>
            <div className="section-toggles">{Object.entries(SECTION_LABELS).map(([k,label])=>(
              <div key={k} className={"toggle-item"+(b.sections[k]?" on":"")} onClick={()=>toggleSec(k)}>{b.sections[k]?"✓":"○"} {label}</div>
            ))}</div>
          </div>
          <div className="field"><label>Header Note (optional)</label><textarea value={b.headerNote} onChange={e=>upd("headerNote",e.target.value)} style={{minHeight:48}}/></div>
          <div className="field"><label>Footer / Disclaimer</label><textarea value={b.footerNote} onChange={e=>upd("footerNote",e.target.value)} style={{minHeight:48}}/></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={()=>{if(!b.name.trim())return alert("Enter name");onSave(b);}}>{bank?"Save Changes":"Add Bank / Client"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Report Wrapper ────────────────────────────────────────────────────────────
function Report({val:v, bank, onEdit, onBack, onConvertFormat, googleToken, googleEmail, googleFolderId, onRequestGoogleAuth, onSaveVal}) {
  const [sig, setSig] = useState(null);
  const [sigFont, setSigFont] = useState(null);
  const [sigColor, setSigColor] = useState(null);
  const [showSigModal, setShowSigModal] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [driveStatus, setDriveStatus] = useState(v.driveLink ? "done" : null);
  const [driveLink, setDriveLink] = useState(v.driveLink || null);
  const col = bank?.color || "var(--blue)";
  const tmplLabel = TEMPLATES.find(t=>t.id===(bank?.reportTemplate||"sectional"))?.label || "Sectional";
  const rptRef = useRef();

  const handleSigApply = (imgData, font, color, name) => {
    setSig(imgData);
    setSigFont(font);
    setSigColor(color);
    setShowSigModal(false);
  };

  const loadHtml2pdf = () => new Promise((res) => {
    if (window.html2pdf) { res(window.html2pdf); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => res(window.html2pdf);
    document.head.appendChild(s);
  });

  const pdfOpts = () => ({
    margin: [10, 10, 10, 10],
    filename: `Valuation_${v.ownerName||"Report"}_${v.reportDate||today()}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css"] }
  });

  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const lib = await loadHtml2pdf();
      await lib().set(pdfOpts()).from(rptRef.current).save();
    } catch(e) { alert("PDF generation failed: " + e.message); }
    setPdfLoading(false);
  };

  const uploadToDrive = async () => {
    const token = gSession.token;
    if (!token) { onRequestGoogleAuth(); return; }
    if (!sig) { alert("Please apply your signature before uploading."); return; }
    setDriveStatus("uploading");
    try {
      const lib = await loadHtml2pdf();
      const pdfBlob = await lib().set(pdfOpts()).from(rptRef.current).outputPdf("blob");
      const fileName = `Valuation_${v.ownerName||"Report"}_${v.reportDate||today()}.pdf`;
      const metadata = { name: fileName, mimeType: "application/pdf", ...(googleFolderId ? { parents: [googleFolderId] } : {}) };
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", pdfBlob, fileName);
      const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token },
        body: form
      });
      const data = await res.json();
      if (data.id) {
        const link = `https://drive.google.com/file/d/${data.id}/view`;
        setDriveLink(link);
        setDriveStatus("done");
        onSaveVal && onSaveVal({...v, driveLink: link});
      } else {
        console.error("Drive error:", data?.error?.code, data?.error?.message);
        setDriveStatus("error");
      }
    } catch(e) { console.error("Drive upload exception:", e); setDriveStatus("error"); }
  };

  return (
    <div className="app">
      <style>{CSS}</style>
      {showSigModal && <SignatureModal signerName="K.P. Satish Babu" onSave={handleSigApply} onClose={()=>setShowSigModal(false)}/>}
      {showConvert && <ConvertModal currentTemplate={bank?.reportTemplate||"sectional"} onConvert={t=>{onConvertFormat(t);setShowConvert(false);}} onClose={()=>setShowConvert(false)}/>}
      <Header>
        <GBtn onClick={onEdit}>✏️ Edit</GBtn>
        <GBtn onClick={()=>setShowConvert(true)}>🔄 Convert Format</GBtn>
        <GBtn onClick={()=>setShowSigModal(true)}>{sig?"✅ Re-sign":"✍️ Sign Report"}</GBtn>
        <button className="btn btn-outline" style={{color:"white",borderColor:"rgba(255,255,255,.4)"}} onClick={downloadPDF} disabled={pdfLoading}>
          {pdfLoading ? "⏳ Generating..." : "⬇️ Download PDF"}
        </button>
        {sig && (
          driveStatus==="done"
            ? <a href={driveLink} target="_blank" rel="noreferrer" className="btn btn-gold" style={{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4}}>📂 Open in Drive</a>
            : <button className="btn btn-gold" onClick={uploadToDrive} disabled={driveStatus==="uploading"} style={{display:"flex",alignItems:"center",gap:5}}>
                {driveStatus==="uploading"?"⏳ Uploading...":"📤 Upload PDF to Drive"}
                {!googleEmail && <span style={{fontSize:9,opacity:.8,background:"rgba(255,255,255,.2)",borderRadius:10,padding:"1px 5px"}}>Login req.</span>}
              </button>
        )}
        {driveStatus==="error" && <span style={{fontSize:11,color:"#ff9999"}}>Upload failed</span>}
        <GBtn onClick={onBack}>← Back</GBtn>
      </Header>
      <div className="rpt-wrap">
        <div style={{maxWidth:960,margin:"0 auto 12px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}} className="no-print">
          <span style={{fontSize:12,fontWeight:600,background:"white",padding:"3px 10px",borderRadius:20,boxShadow:"var(--shadow)",color:col}}>📋 {tmplLabel}</span>
          {googleEmail && <span style={{fontSize:11,background:"#e6f4ea",color:"#1a5c38",padding:"3px 10px",borderRadius:20}}>🔒 {googleEmail}</span>}
          {!sig && <span style={{fontSize:12,background:"#fff3cd",color:"#856404",padding:"3px 10px",borderRadius:20}}>Click "Sign Report" to apply your digital signature</span>}
        </div>
        <div className="rpt-page" ref={rptRef}><ReportBody v={v} bank={bank} col={col} sig={sig} sigFont={sigFont} sigColor={sigColor}/></div>
      </div>
    </div>
  );
}

// ─── Valuation Form ────────────────────────────────────────────────────────────
const STEPS = ["Request","Location","Site Details","Valuation","Photos","Review"];

function ValForm({valuation:init, bank, onSave, onCancel}) {
  const [v, setV] = useState(init);
  const [step, setStep] = useState(0);
  const fileRef = useRef();
  const upd = (k,val) => setV(c=>({...c,[k]:val}));
  const calc = calcValuation(v);
  const depSug = suggestDep(v.constructionAge, v.constructionType);
  const handleAge = (age) => setV(c=>({...c,constructionAge:age,depreciationPct:c.depreciationAuto?suggestDep(age,c.constructionType):c.depreciationPct}));
  const handleConstr = (type) => setV(c=>({...c,constructionType:type,depreciationPct:c.depreciationAuto?suggestDep(c.constructionAge,type):c.depreciationPct}));
  const handlePhotos = (files) => Array.from(files).forEach(file=>{
    const r=new FileReader(); r.onload=e=>setV(c=>({...c,photos:[...(c.photos||[]),{id:uid(),url:e.target.result,caption:file.name.replace(/\.[^.]+$/,"")}]})); r.readAsDataURL(file);
  });
  const addCF = () => setV(c=>({...c,customFields:[...(c.customFields||[]),{id:uid(),label:"",value:""}]}));
  const updCF = (id,k,val) => setV(c=>({...c,customFields:c.customFields.map(f=>f.id===id?{...f,[k]:val}:f)}));
  const remCF = (id) => setV(c=>({...c,customFields:c.customFields.filter(f=>f.id!==id)}));
  const doSave = (status) => onSave({...calcValuation(v),status});
  const totalFloor = totalFloorArea(v);
  const farBUA = Math.round(parseFloat(v.landArea||0)*parseFloat(v.farConsidered||1.75));

  return (
    <div className="app">
      <style>{CSS}</style>
      <Header><GBtn onClick={onCancel}>Back</GBtn></Header>
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">{v.ownerName||"New Valuation"}</div>
            <div className="page-sub">{bank?"For: "+bank.name:""}{v.propertyAddress?" - "+v.propertyAddress:""}</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-outline btn-sm" onClick={()=>doSave("progress")}>Save Draft</button>
            <button className="btn btn-gold btn-sm" onClick={()=>doSave("done")}>Finalise + Report</button>
          </div>
        </div>
        <div className="steps">{STEPS.map((s,i)=>(
          <div key={i} className={"step"+(step===i?" active":i<step?" done":"")} onClick={()=>setStep(i)}>
            <div className="step-num">{i<step?"✓":i+1}</div>
            <div className="step-label">{s}</div>
          </div>
        ))}</div>

        {step===0 && (<>
          <div className="form-card">
            <div className="form-sec-hdr">General and Customer Details</div>
            <div className="form-body">
              <F label="Application Number" span="2"><input value={v.applicationNumber} onChange={e=>upd("applicationNumber",e.target.value)} placeholder="e.g. A50682838"/></F>
              <F label="Purpose"><input value={v.purpose} onChange={e=>upd("purpose",e.target.value)}/></F>
              <F label="Customer Name" span="2"><input value={v.customerName} onChange={e=>upd("customerName",e.target.value)} placeholder="Firm or individual"/></F>
              <F label="Property Owner Name"><input value={v.ownerName} onChange={e=>upd("ownerName",e.target.value)}/></F>
              <F label="Owner Contact" span="2"><input value={v.ownerContact} onChange={e=>upd("ownerContact",e.target.value)}/></F>
              <F label="Person Met at Site"><input value={v.personMetName} onChange={e=>upd("personMetName",e.target.value)}/></F>
              <F label="Person Phone"><input value={v.personMetPhone} onChange={e=>upd("personMetPhone",e.target.value)}/></F>
              <F label="Relation with Customer"><Sel value={v.personRelation} onChange={e=>upd("personRelation",e.target.value)} options={["Self","Tenant","Caretaker","Power of Attorney","Others"]}/></F>
            </div>
          </div>
          <div className="form-card">
            <div className="form-sec-hdr">Field Engineer Details</div>
            <div className="form-body c2">
              <F label="Field Engineer Name"><input value={v.fieldEngineerName} onChange={e=>upd("fieldEngineerName",e.target.value)}/></F>
              <F label="Date of Site Visit"><input type="date" value={v.fieldEngineerDate} onChange={e=>upd("fieldEngineerDate",e.target.value)}/></F>
              <F label="Engineer Name (Report Prepared by)"><input value={v.engineerName} onChange={e=>upd("engineerName",e.target.value)}/></F>
              <F label="Report Date"><input type="date" value={v.reportDate} onChange={e=>upd("reportDate",e.target.value)}/></F>
            </div>
          </div>
          <div className="form-card">
            <div className="form-sec-hdr">Document Details</div>
            <div className="form-body">
              <F label="Layout Plan"><Sel value={v.layoutPlan} onChange={e=>upd("layoutPlan",e.target.value)} options={["NA","Yes","No"]}/></F>
              <F label="Building Plan"><Sel value={v.buildingPlan} onChange={e=>upd("buildingPlan",e.target.value)} options={["NA","Yes","No"]}/></F>
              <F label="Construction Permission"><Sel value={v.constructionPermission} onChange={e=>upd("constructionPermission",e.target.value)} options={["NA","Yes","No"]}/></F>
              <F label="Approval Authority"><input value={v.approvalAuthority} onChange={e=>upd("approvalAuthority",e.target.value)}/></F>
              <F label="Approval Number"><input value={v.approvalNumber} onChange={e=>upd("approvalNumber",e.target.value)}/></F>
              <F label="Approval Date"><input value={v.approvalDate} onChange={e=>upd("approvalDate",e.target.value)}/></F>
              <F label="Usage as per Plan"><input value={v.propertyUsageDoc} onChange={e=>upd("propertyUsageDoc",e.target.value)}/></F>
              <F label="Usage at Site"><input value={v.propertyUsageSite} onChange={e=>upd("propertyUsageSite",e.target.value)}/></F>
              <F label="Property Category"><Sel value={v.propertyCategory} onChange={e=>upd("propertyCategory",e.target.value)} options={PROP_CATEGORIES}/></F>
              <F label="Documents Studied / Produced" span="3"><textarea value={v.documentsStudied} onChange={e=>upd("documentsStudied",e.target.value)} style={{minHeight:52}}/></F>
            </div>
          </div>
        </>)}

        {step===1 && (
          <div className="form-card">
            <div className="form-sec-hdr">Property Location</div>
            <div className="form-body">
              <F label="Address at Site (Postal)" span="3"><input value={v.propertyAddress} onChange={e=>upd("propertyAddress",e.target.value)}/></F>
              <F label="Legal Address (Survey No. / FP No.)" span="3"><input value={v.legalAddress} onChange={e=>upd("legalAddress",e.target.value)}/></F>
              <F label="City"><input value={v.city} onChange={e=>upd("city",e.target.value)}/></F>
              <F label="District"><input value={v.district} onChange={e=>upd("district",e.target.value)}/></F>
              <F label="State"><Sel value={v.state} onChange={e=>upd("state",e.target.value)} options={STATES}/></F>
              <F label="PIN Code"><input value={v.pincode} onChange={e=>upd("pincode",e.target.value)}/></F>
              <F label="Nearby Landmark" span="2"><input value={v.nearbyLandmark} onChange={e=>upd("nearbyLandmark",e.target.value)}/></F>
              <F label="Latitude"><input value={v.latitude} onChange={e=>upd("latitude",e.target.value)}/></F>
              <F label="Longitude"><input value={v.longitude} onChange={e=>upd("longitude",e.target.value)}/></F>
              <F label="Seismic Zone"><Sel value={v.seismicZone} onChange={e=>upd("seismicZone",e.target.value)} options={SEISMIC_ZONES}/></F>
              <F label="Property Authority"><Sel value={v.propertyAuth} onChange={e=>upd("propertyAuth",e.target.value)} options={PROPERTY_AUTH}/></F>
              <F label="Distance from Branch (km)"><input type="number" value={v.distanceFromBranch} onChange={e=>upd("distanceFromBranch",e.target.value)}/></F>
              <F label="Type of Locality"><Sel value={v.typeOfLocality} onChange={e=>upd("typeOfLocality",e.target.value)} options={LOCALITIES}/></F>
              <F label="Class of Locality"><Sel value={v.classOfLocality} onChange={e=>upd("classOfLocality",e.target.value)} options={LOCALITY_CLASS}/></F>
              <F label="Road Facing"><Sel value={v.roadFacing} onChange={e=>upd("roadFacing",e.target.value)} options={["North","South","East","West","North-East","North-West","South-East","South-West"]}/></F>
              <F label="Road Type"><Sel value={v.roadType} onChange={e=>upd("roadType",e.target.value)} options={ROAD_TYPES}/></F>
              <F label="Road Width (ft)"><input type="number" value={v.roadWidth} onChange={e=>upd("roadWidth",e.target.value)}/></F>
              <F label="Electricity Connection"><Sel value={v.electricityConnection} onChange={e=>upd("electricityConnection",e.target.value)} options={["Yes","No","NA"]}/></F>
              <F label="Water / Drainage"><Sel value={v.waterDrainage} onChange={e=>upd("waterDrainage",e.target.value)} options={["Yes","No","NA"]}/></F>
            </div>
          </div>
        )}

        {step===2 && (<>
          <div className="form-card">
            <div className="form-sec-hdr">Plot and Boundaries</div>
            <div className="form-body">
              <F label="Site Area (sft)"><input type="number" value={v.landArea} onChange={e=>upd("landArea",e.target.value)}/></F>
              <F label="Site Area as per Document (sft)"><input type="number" value={v.plotAreaDoc} onChange={e=>upd("plotAreaDoc",e.target.value)}/></F>
              <F label="Plot Demarcated"><Sel value={v.plotDemarcated} onChange={e=>upd("plotDemarcated",e.target.value)} options={["Yes","No","Partly"]}/></F>
              <F label="East Boundary (Deed)"><input value={v.eastDoc} onChange={e=>upd("eastDoc",e.target.value)}/></F>
              <F label="East Boundary (Actual)"><input value={v.east} onChange={e=>upd("east",e.target.value)}/></F>
              <F label="Boundaries Matching"><Sel value={v.boundariesMatching} onChange={e=>upd("boundariesMatching",e.target.value)} options={["Yes","Partly Matching","No"]}/></F>
              <F label="North Boundary (Deed)"><input value={v.northDoc} onChange={e=>upd("northDoc",e.target.value)}/></F>
              <F label="North Boundary (Actual)"><input value={v.north} onChange={e=>upd("north",e.target.value)}/></F>
              <F label="West Boundary (Deed)"><input value={v.westDoc} onChange={e=>upd("westDoc",e.target.value)}/></F>
              <F label="West Boundary (Actual)"><input value={v.west} onChange={e=>upd("west",e.target.value)}/></F>
              <F label="South Boundary (Deed)"><input value={v.southDoc} onChange={e=>upd("southDoc",e.target.value)}/></F>
              <F label="South Boundary (Actual)"><input value={v.south} onChange={e=>upd("south",e.target.value)}/></F>
            </div>
          </div>
          <div className="form-card">
            <div className="form-sec-hdr">Construction, Floor Details and Occupancy</div>
            <div className="form-body">
              <F label="Property Type"><Sel value={v.propertyType} onChange={e=>upd("propertyType",e.target.value)} options={PROPERTY_TYPES}/></F>
              <F label="Construction Type"><Sel value={v.constructionType} onChange={e=>handleConstr(e.target.value)} options={CONSTRUCTION_TYPES}/></F>
              <F label="Age of Structure (Years)"><input type="number" value={v.constructionAge} onChange={e=>handleAge(e.target.value)}/></F>
              <div className="field">
                <label>Depreciation % {v.depreciationAuto&&depSug&&<span className="auto-tag">Auto</span>}</label>
                <div style={{display:"flex",gap:6}}>
                  <input type="number" value={v.depreciationPct} min="0" max="100" style={{flex:1}}
                    onChange={e=>setV(c=>({...c,depreciationPct:e.target.value,depreciationAuto:false}))}
                    placeholder={depSug?"Suggested: "+depSug+"%":"e.g. 16"}/>
                  {!v.depreciationAuto&&depSug&&<button className="btn btn-outline btn-sm" onClick={()=>setV(c=>({...c,depreciationPct:depSug,depreciationAuto:true}))}>Reset</button>}
                </div>
                {depSug&&v.constructionAge&&<span className="field-hint">Suggested {depSug}% for {v.constructionAge}yr {v.constructionType}</span>}
              </div>
              <F label="Residual Age (Years)"><input type="number" value={v.residualAge} onChange={e=>upd("residualAge",e.target.value)}/></F>
              <F label="Overall Condition"><Sel value={v.condition} onChange={e=>upd("condition",e.target.value)} options={CONDITIONS}/></F>
              <F label="Interior Quality"><Sel value={v.interiorQuality} onChange={e=>upd("interiorQuality",e.target.value)} options={CONDITIONS}/></F>
              <F label="Exterior Quality"><Sel value={v.exteriorQuality} onChange={e=>upd("exteriorQuality",e.target.value)} options={CONDITIONS}/></F>
              <F label="Maintenance Level"><Sel value={v.maintenanceLevel} onChange={e=>upd("maintenanceLevel",e.target.value)} options={["Good","Average","Poor"]}/></F>
              <F label="Roof Type"><Sel value={v.roofType} onChange={e=>upd("roofType",e.target.value)} options={ROOF_TYPES}/></F>
              <F label="Wall Quality"><Sel value={v.wallType} onChange={e=>upd("wallType",e.target.value)} options={WALL_TYPES}/></F>
              <F label="Floor Finish"><Sel value={v.floorType} onChange={e=>upd("floorType",e.target.value)} options={FLOOR_TYPES}/></F>
              <F label="Risk of Demolition"><Sel value={v.riskOfDemolition} onChange={e=>upd("riskOfDemolition",e.target.value)} options={RISK_LEVELS}/></F>
              <F label="Amenities" span="2"><input value={v.amenitiesDesc} onChange={e=>upd("amenitiesDesc",e.target.value)} placeholder="OH Tank, Sump, Bore well, Elevation..."/></F>
            </div>
            <div style={{padding:"0 20px 18px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",marginBottom:10}}>Floor-wise Built-Up Areas (sft)</div>
              <div className="form-body c4" style={{padding:0}}>
                <F label="Ground Floor (GF)"><input type="number" value={v.gfArea} onChange={e=>upd("gfArea",e.target.value)}/></F>
                <F label="First Floor (FF)"><input type="number" value={v.ffArea} onChange={e=>upd("ffArea",e.target.value)}/></F>
                <F label="Second Floor (SF)"><input type="number" value={v.sfArea} onChange={e=>upd("sfArea",e.target.value)}/></F>
                <F label="Third Floor (TF)"><input type="number" value={v.tfArea} onChange={e=>upd("tfArea",e.target.value)}/></F>
                <F label="4th Floor"><input type="number" value={v.ff4Area} onChange={e=>upd("ff4Area",e.target.value)}/></F>
                <F label="5th Floor"><input type="number" value={v.ff5Area} onChange={e=>upd("ff5Area",e.target.value)}/></F>
                <div className="field" style={{background:"#eef3fa",borderRadius:8,padding:"10px 12px",gridColumn:"span 2"}}><label>Total Actual BUA</label><div style={{fontSize:16,fontWeight:700,color:"var(--blue)",marginTop:2}}>{fmt(totalFloor)} sft</div></div>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",marginBottom:10,marginTop:16}}>Occupancy Details</div>
              <div className="form-body c2" style={{padding:0}}>
                <F label="Occupancy Status"><Sel value={v.occupancyStatus} onChange={e=>upd("occupancyStatus",e.target.value)} options={["Occupied","Vacant","Partially Occupied","Under Construction"]}/></F>
                <F label="Occupied By"><input value={v.occupiedBy} onChange={e=>upd("occupiedBy",e.target.value)} placeholder="Self / Tenants / Both"/></F>
                <F label="Relation of Occupant"><input value={v.occupancyRelation} onChange={e=>upd("occupancyRelation",e.target.value)}/></F>
                <F label="Occupied Since"><input value={v.occupiedSince} onChange={e=>upd("occupiedSince",e.target.value)}/></F>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",marginBottom:10,marginTop:16}}>Additional (Arka / Orix)</div>
              <div className="form-body c4" style={{padding:0}}>
                <F label="Front Setback (ft)"><input type="number" value={v.frontSetback} onChange={e=>upd("frontSetback",e.target.value)}/></F>
                <F label="Rear Setback (ft)"><input type="number" value={v.rearSetback} onChange={e=>upd("rearSetback",e.target.value)}/></F>
                <F label="Left Setback (ft)"><input type="number" value={v.leftSetback} onChange={e=>upd("leftSetback",e.target.value)}/></F>
                <F label="Right Setback (ft)"><input type="number" value={v.rightSetback} onChange={e=>upd("rightSetback",e.target.value)}/></F>
                <F label="Building Height (ft)"><input type="number" value={v.buildingHeight} onChange={e=>upd("buildingHeight",e.target.value)}/></F>
                <F label="Floor Height (ft)"><input type="number" value={v.floorHeight} onChange={e=>upd("floorHeight",e.target.value)}/></F>
                <F label="Flood Prone Area"><Sel value={v.floodProne||"No"} onChange={e=>upd("floodProne",e.target.value)} options={["No","Yes"]}/></F>
                <F label="Soil Type"><input value={v.soilType} onChange={e=>upd("soilType",e.target.value)} placeholder="Hard Rock / Soft"/></F>
              </div>
            </div>
          </div>
        </>)}

        {step===3 && (<>
          <div className="form-card">
            <div className="form-sec-hdr">Valuation Rates and Areas</div>
            <div className="form-body c2">
              <F label="Land / Site Area (sft)"><input type="number" value={v.landArea} onChange={e=>upd("landArea",e.target.value)}/></F>
              <F label="Land Rate (Rs./sft)"><input type="number" value={v.landRate} onChange={e=>upd("landRate",e.target.value)}/></F>
              <F label="Permissible FSI / FAR"><input value={v.farPermitted} onChange={e=>upd("farPermitted",e.target.value)}/></F>
              <F label="FAR Considered"><input value={v.farConsidered} onChange={e=>upd("farConsidered",e.target.value)}/></F>
              <F label="BUA as per FAR (sft)" hint={v.landArea&&v.farConsidered?"Auto: "+farBUA+" sft":""}>
                <input type="number" value={v.builtUpAreaFAR} onChange={e=>upd("builtUpAreaFAR",e.target.value)} placeholder={v.landArea&&v.farConsidered?farBUA.toString():"sft"}/>
              </F>
              <F label="Actual BUA (sft)"><input type="number" value={v.builtUpAreaActual} onChange={e=>upd("builtUpAreaActual",e.target.value)} placeholder={totalFloor?totalFloor.toString():"sft"}/></F>
              <F label="Construction Rate (Rs./sft)"><input type="number" value={v.constructionRate} onChange={e=>upd("constructionRate",e.target.value)}/></F>
              <F label="Ward Robes Value (Rs.)"><input type="number" value={v.wardrobeValue} onChange={e=>upd("wardrobeValue",e.target.value)}/></F>
              <F label="Amenities Value (Rs.)"><input type="number" value={v.amenitiesValue} onChange={e=>upd("amenitiesValue",e.target.value)}/></F>
              <F label="Final Value Override (Rs.)" hint="Leave blank for auto-calc"><input type="number" value={v.finalValue} onChange={e=>upd("finalValue",e.target.value)}/></F>
              <F label="Govt. Guideline Rate (Rs./sft)"><input type="number" value={v.govtGuidelineRate} onChange={e=>upd("govtGuidelineRate",e.target.value)}/></F>
              <F label="Composite Rate (Rs./sft)" hint="For Religare Composite Method"><input type="number" value={v.compositeRate} onChange={e=>upd("compositeRate",e.target.value)}/></F>
            </div>
          </div>
          <div className="calc-box">
            <div className="calc-title">Auto Calculation Preview</div>
            <div className="calc-row"><span style={{opacity:.8}}>Land Value ({fmt(v.landArea)} sft x Rs.{fmt(v.landRate)})</span><span style={{fontWeight:600}}>{fmtRs(calc.landValue)}</span></div>
            <div className="calc-row"><span style={{opacity:.8}}>Construction ({fmt(v.builtUpAreaFAR||farBUA)} sft x Rs.{fmt(v.constructionRate)})</span><span style={{fontWeight:600}}>{fmtRs(calc.constructionValue)}</span></div>
            {v.wardrobeValue&&<div className="calc-row"><span style={{opacity:.8}}>Ward Robes</span><span style={{fontWeight:600}}>{fmtRs(v.wardrobeValue)}</span></div>}
            {v.amenitiesValue&&<div className="calc-row"><span style={{opacity:.8}}>Amenities</span><span style={{fontWeight:600}}>{fmtRs(v.amenitiesValue)}</span></div>}
            <div className="calc-row"><span style={{opacity:.8}}>Building Value (Before Dep.)</span><span style={{fontWeight:600}}>{fmtRs(calc.totalBuildingValueBeforeDep)}</span></div>
            <div className="calc-row"><span style={{opacity:.8}}>Depreciation ({v.depreciationPct||0}%)</span><span style={{fontWeight:600,color:"var(--gold-light)"}}>- {fmtRs(calc.depreciationValue)}</span></div>
            <div className="calc-row"><span style={{opacity:.8}}>Building Value After Dep.</span><span style={{fontWeight:600}}>{fmtRs(calc.totalBuildingValueAfterDep)}</span></div>
            <div className="calc-total"><span className="calc-total-label">FAIR MARKET VALUE</span><span className="calc-total-value">{fmtRs(calc.finalValue)}</span></div>
            <div style={{marginTop:4,fontSize:10,opacity:.7,textAlign:"center"}}>{fmtW(calc.finalValue)}</div>
            <div className="calc-sub-vals">
              <div className="calc-sub"><div className="calc-sub-label">Realizable (90%)</div><div className="calc-sub-value">{fmtRs(calc.realizableValue)}</div></div>
              <div className="calc-sub"><div className="calc-sub-label">Distressed (75%)</div><div className="calc-sub-value">{fmtRs(calc.distressedValue)}</div></div>
            </div>
          </div>
          <div className="form-card" style={{marginTop:18}}>
            <div className="form-sec-hdr">Remarks and Custom Fields</div>
            <div style={{padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
              <div className="field"><label>Remarks (numbered)</label><textarea value={v.remarks} onChange={e=>upd("remarks",e.target.value)} style={{minHeight:100}} placeholder={"1. As per actual visit...\n2. As per document...\n3. Sanction plan not produced..."}/></div>
              <div className="field"><label>Deviation Remarks</label><textarea value={v.deviationRemarks} onChange={e=>upd("deviationRemarks",e.target.value)} style={{minHeight:60}}/></div>
              <div style={{fontSize:11,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase"}}>Custom Fields</div>
              {(v.customFields||[]).map(f=>(
                <div key={f.id} className="cfield-row">
                  <div className="field"><label>Field Name</label><input value={f.label} onChange={e=>updCF(f.id,"label",e.target.value)}/></div>
                  <div className="field"><label>Value</label><input value={f.value} onChange={e=>updCF(f.id,"value",e.target.value)}/></div>
                  <button className="btn btn-danger btn-sm" style={{alignSelf:"flex-end"}} onClick={()=>remCF(f.id)}>x</button>
                </div>
              ))}
              <button className="btn btn-outline" style={{width:"fit-content"}} onClick={addCF}>+ Add Custom Field</button>
            </div>
          </div>
        </>)}

        {step===4 && (
          <div className="form-card">
            <div className="form-sec-hdr">Site Photographs</div>
            <div style={{padding:18}}>
              <input ref={fileRef} type="file" multiple accept="image/*" style={{display:"none"}} onChange={e=>handlePhotos(e.target.files)}/>
              <div className="photo-drop" onClick={()=>fileRef.current.click()}
                onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--blue)";}}
                onDragLeave={e=>{e.currentTarget.style.borderColor="";}}
                onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="";handlePhotos(e.dataTransfer.files);}}>
                <div style={{fontSize:32,marginBottom:7}}>📸</div>
                <div style={{fontWeight:600,color:"var(--ink2)"}}>Click to upload or drag and drop</div>
                <div style={{fontSize:12,color:"var(--ink2)",opacity:.7,marginTop:3}}>JPG, PNG — multiple files allowed</div>
              </div>
              {v.photos?.length>0 && <div className="photo-grid">{v.photos.map(p=>(
                <div key={p.id}>
                  <div className="photo-item"><img src={p.url} alt={p.caption}/><button className="photo-remove" onClick={()=>setV(c=>({...c,photos:c.photos.filter(x=>x.id!==p.id)}))}>x</button></div>
                  <div className="photo-caption"><input value={p.caption} placeholder="Caption..." onChange={e=>setV(c=>({...c,photos:c.photos.map(x=>x.id===p.id?{...x,caption:e.target.value}:x)}))}/></div>
                </div>
              ))}</div>}
            </div>
          </div>
        )}

        {step===5 && (
          <div className="form-card">
            <div className="form-sec-hdr">Final Review</div>
            <div style={{padding:"16px 20px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[["App No.",v.applicationNumber],["Owner",v.ownerName],["City",v.city],["Property Type",v.propertyType],
                ["Site Area",fmt(v.landArea)+" sft"],["Total BUA",fmt(totalFloor)+" sft"],["BUA (FAR)",fmt(v.builtUpAreaFAR||farBUA)+" sft"],["Age / Dep",v.constructionAge+"yr / "+v.depreciationPct+"%"],
                ["Photos",(v.photos?.length||0)+" uploaded"],["Custom Fields",(v.customFields?.length||0)+""],["FMV",fmtRs(v.finalValue||calc.finalValue)],["Realizable",fmtRs(v.realizableValue||calc.realizableValue)]
              ].map(([k,val])=>(
                <div key={k} style={{background:"var(--paper)",borderRadius:9,padding:"9px 12px",border:"1.5px solid var(--border)"}}>
                  <div style={{fontSize:10,color:"var(--ink2)",fontWeight:700,textTransform:"uppercase",letterSpacing:".3px"}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:600,marginTop:3,color:"var(--blue)"}}>{val||"—"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="actions-bar">
          {step>0&&<button className="btn btn-outline" onClick={()=>setStep(s=>s-1)}>Previous</button>}
          {step<5&&<button className="btn btn-primary" onClick={()=>setStep(s=>s+1)}>Next</button>}
          {step===5&&<button className="btn btn-gold btn-lg" onClick={()=>doSave("done")}>Generate Report</button>}
        </div>
      </div>
    </div>
  );
}

// ─── BankDetail ────────────────────────────────────────────────────────────────
function BankDetail({bank, valuations, onNew, onOpenVal, onDeleteVal, onBack}) {
  const bVals = valuations.filter(v=>v.bankId===bank.id);
  const sbCls = (s) => "badge badge-"+(s==="done"?"done":s==="progress"?"progress":"pending");
  const slbl = (s) => s==="done"?"Completed":s==="progress"?"In Progress":"Pending";
  const picon = (t) => t?.includes("Commercial")?"🏢":t?.includes("Agricultural")?"🌾":t?.includes("Flat")?"🏠":"🏡";
  const tmplLabel = TEMPLATES.find(t=>t.id===bank.reportTemplate)?.label||"Sectional";
  return (
    <div className="app">
      <style>{CSS}</style>
      <Header>
        <button className="btn btn-outline" style={{color:"white",borderColor:"rgba(255,255,255,.4)",gap:5}} onClick={onBack}>🏠 Dashboard</button>
      </Header>
      <div className="page">
        <div className="breadcrumb"><span className="bc-link" onClick={onBack}>Dashboard</span><span style={{opacity:.4}}> &gt; </span><span style={{fontWeight:600,color:bank.color}}>{bank.name}</span></div>
        <div className="page-header">
          <div>
            <div className="page-title" style={{color:bank.color}}>{bank.name}</div>
            <div className="page-sub">{bank.branch} — {bVals.length} valuation{bVals.length!==1?"s":""} — {tmplLabel} format</div>
          </div>
          <button className="btn btn-gold" onClick={onNew}>+ New Valuation</button>
        </div>
        <div className="stats" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
          <div className="stat-card" style={{borderColor:bank.color}}><div className="stat-num" style={{color:bank.color}}>{bVals.length}</div><div className="stat-label">Total</div></div>
          <div className="stat-card" style={{borderColor:"#c9921a"}}><div className="stat-num" style={{color:"#a87816"}}>{bVals.filter(v=>v.status==="pending").length}</div><div className="stat-label">Pending</div></div>
          <div className="stat-card" style={{borderColor:"#3d6b5a"}}><div className="stat-num" style={{color:"#3d6b5a"}}>{bVals.filter(v=>v.status==="done").length}</div><div className="stat-label">Completed</div></div>
        </div>
        {bVals.length===0?(
          <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-title">No Valuations Yet</div><div style={{fontSize:13,color:"var(--ink2)",marginTop:6}}>Click New Valuation to get started</div></div>
        ):bVals.map(v=>(
          <div key={v.id} className="val-card" onClick={()=>onOpenVal(v)}>
            <div className="val-icon" style={{background:bank.color+"18"}}>{picon(v.propertyType)}</div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span className="val-name">{v.ownerName||"Unnamed Owner"}</span>
                <span className={sbCls(v.status)}>{slbl(v.status)}</span>
              </div>
              <div className="val-address">{v.propertyAddress}{v.city?", "+v.city:""}</div>
              <div className="val-meta">
                <span>{v.propertyType}</span>
                {v.applicationNumber&&<span>App: {v.applicationNumber}</span>}
                {v.fieldEngineerDate&&<span>{v.fieldEngineerDate}</span>}
                {v.fieldEngineerName&&<span>{v.fieldEngineerName}</span>}
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontWeight:700,fontSize:13,color:"var(--sage)"}}>{v.finalValue?fmtRs(v.finalValue):"Pending"}</div>
              <div style={{marginTop:7,display:"flex",gap:5}}>
                {v.status==="done"&&<span className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();onOpenVal(v,true);}}>Report</span>}
                <span className="btn btn-sm" style={{background:"#fff0f0",color:"#dc3545",border:"1px solid #f5c2c7"}} onClick={e=>{e.stopPropagation();onDeleteVal(v.id);}}>Delete</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
const DEMO_BANKS = [
  {id:"b1",name:"IndusInd Bank",branch:"Bangalore Central",color:"#1f4e79",reportTitle:"VALUATION REPORT FOR LAP – INDUSIND BANK LTD.",reportTemplate:"sectional",headerNote:"",footerNote:"Fair market value indicated is an opinion of value prevailing on the date of inspection. Client is free to obtain independent opinions.",sections:{...DEFAULT_SECTIONS}},
  {id:"b2",name:"Federal Bank",branch:"Koramangala Branch",color:"#1a5c38",reportTitle:"TECHNICAL REPORT",reportTemplate:"tabular",headerNote:"",footerNote:"This valuation is done as per FED guidelines. Kindly verify legal documents before disbursement.",sections:{...DEFAULT_SECTIONS}},
  {id:"b3",name:"Hinduja Leyland Finance",branch:"Bangalore",color:"#7b1c1c",reportTitle:"TECHNICAL SCRUTINY REPORT",reportTemplate:"hinduja",headerNote:"",footerNote:"This report is prepared for loan sanctioning purposes only.",sections:{...DEFAULT_SECTIONS}},
  {id:"b4",name:"Incred Financial Services",branch:"Bangalore",color:"#4a2070",reportTitle:"TECHNICAL APPRAISAL REPORT",reportTemplate:"incred",headerNote:"",footerNote:"The value indicated is the fair market value as on the date of inspection.",sections:{...DEFAULT_SECTIONS}},
  {id:"b5",name:"Religare Finvest Ltd.",branch:"Bangalore",color:"#7a4a10",reportTitle:"PROPERTY APPRAISAL REPORT",reportTemplate:"religare",headerNote:"",footerNote:"Distress value may be taken in range of 70 to 80% of FMV.",sections:{...DEFAULT_SECTIONS}},
  {id:"b6",name:"Orix Finance",branch:"Bangalore",color:"#1c4a5c",reportTitle:"VALUATION REPORT",reportTemplate:"orix",headerNote:"",footerNote:"This report is prepared as per Orix guidelines.",sections:{...DEFAULT_SECTIONS}},
  {id:"b7",name:"Arka Fincap",branch:"Bangalore",color:"#3d3d00",reportTitle:"TECHNICAL APPRAISAL REPORT",reportTemplate:"arka",headerNote:"",footerNote:"This valuation is an opinion of value and is not a guarantee of sale.",sections:{...DEFAULT_SECTIONS}},
];

// ─── Google Drive Setup Modal ──────────────────────────────────────────────────
function GoogleSetupModal({onClose, onConnect}) {
  return (
    <div className="sig-pad-overlay" onClick={onClose}>
      <div className="sig-pad-modal" style={{maxWidth:380,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:36,marginBottom:12}}>📂</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"var(--blue)",marginBottom:8}}>Connect Google Drive</div>
        <div style={{fontSize:12,color:"var(--ink2)",marginBottom:20,lineHeight:1.7}}>Sign in with your Google account to enable uploading valuation reports directly to Drive.</div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={()=>onConnect()}>
            <span style={{fontSize:14}}>🔗</span> Connect Google Drive
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const LS_BANKS = "kpsb_banks";
  const LS_VALS  = "kpsb_vals";

  const [banks, setBanks] = useState(() => {
    try { const s = localStorage.getItem(LS_BANKS); return s ? JSON.parse(s) : DEMO_BANKS; } catch { return DEMO_BANKS; }
  });
  const [valuations, setValuations] = useState(() => {
    try { const s = localStorage.getItem(LS_VALS); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  useEffect(() => { try { localStorage.setItem(LS_BANKS, JSON.stringify(banks)); } catch {} }, [banks]);
  useEffect(() => { try { localStorage.setItem(LS_VALS,  JSON.stringify(valuations)); } catch {} }, [valuations]);

  const [view, setView] = useState("dashboard");
  const [selBank, setSelBank] = useState(null);
  const [curVal, setCurVal] = useState(null);
  const [bankModal, setBankModal] = useState(null);
  const [googleEmail, setGoogleEmail] = useState(gSession.email);
  const [googleToken, setGoogleToken] = useState(gSession.token);
  const [googleFolderId] = useState(GOOGLE_FOLDER_ID);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);

  const loadGSI = () => new Promise((res) => {
    if (window.google?.accounts?.oauth2) { res(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = res;
    document.head.appendChild(s);
  });

  const connectGoogle = async () => {
    await loadGSI();
    gSession.client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
      callback: async (tkn) => {
        if (tkn.access_token) {
          gSession.token = tkn.access_token;
          setGoogleToken(tkn.access_token);
          try {
            const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers:{ Authorization:"Bearer "+tkn.access_token } });
            const info = await r.json();
            gSession.email = info.email || "Google Account";
            setGoogleEmail(gSession.email);
          } catch { gSession.email = "Google Account"; setGoogleEmail("Google Account"); }
          setShowGoogleSetup(false);
        }
      }
    });
    gSession.client.requestAccessToken({ prompt: "select_account" });
  };

  const requestGoogleAuth = () => {
    if (gSession.token) return;
    connectGoogle(GOOGLE_CLIENT_ID, GOOGLE_FOLDER_ID);
  };

  const disconnectGoogle = () => {
    gSession.token = null; gSession.email = null; gSession.client = null;
    setGoogleToken(null); setGoogleEmail(null);
  };

  const saveBank = (b) => { setBanks(bs => bs.some(x=>x.id===b.id) ? bs.map(x=>x.id===b.id?b:x) : [...bs,b]); setBankModal(null); };
  const delBank  = (id) => { if(!confirm("Delete this bank and all its valuations?")) return; setBanks(bs=>bs.filter(b=>b.id!==id)); setValuations(vs=>vs.filter(v=>v.bankId!==id)); };
  const saveVal  = (v, stayOnView=false)  => { setValuations(vs => vs.some(x=>x.id===v.id) ? vs.map(x=>x.id===v.id?v:x) : [...vs,v]); setCurVal(v); if (!stayOnView) setView(v.status==="done"?"report":"bank"); };
  const delVal   = (id) => { if(!confirm("Delete this valuation?")) return; setValuations(vs=>vs.filter(v=>v.id!==id)); };
  const openVal  = (v, forceReport=false) => { setCurVal(v); setView(forceReport||v.status==="done"?"report":"form"); };
  const convertFormat = (newTemplate) => {
    if (!selBank) return;
    const updated = {...selBank, reportTemplate:newTemplate};
    setBanks(bs => bs.map(b=>b.id===selBank.id?updated:b));
    setSelBank(updated);
  };

  if (view==="report"&&curVal) {
    const bank = selBank||banks.find(b=>b.id===curVal.bankId);
    return (<>
      {showGoogleSetup && <GoogleSetupModal onClose={()=>setShowGoogleSetup(false)} onConnect={connectGoogle}/>}
      <Report val={curVal} bank={bank} onEdit={()=>setView("form")} onBack={()=>{setSelBank(bank);setView("bank");}} onConvertFormat={convertFormat} googleToken={googleToken} googleEmail={googleEmail} googleFolderId={googleFolderId} onRequestGoogleAuth={requestGoogleAuth} onSaveVal={v=>saveVal(v,true)}/>
    </>);
  }
  if (view==="form"&&curVal) {
    const bank = selBank||banks.find(b=>b.id===curVal.bankId);
    return <ValForm valuation={curVal} bank={bank} onSave={saveVal} onCancel={()=>setView("bank")}/>;
  }
  if (view==="bank"&&selBank) {
    return <BankDetail bank={selBank} valuations={valuations} onNew={()=>{setCurVal(defaultVal(selBank.id));setView("form");}} onOpenVal={openVal} onDeleteVal={delVal} onBack={()=>setView("dashboard")}/>;
  }

  return (
    <div className="app">
      <style>{CSS}</style>
      {bankModal!==null&&<BankModal bank={bankModal==="new"?null:bankModal} onSave={saveBank} onClose={()=>setBankModal(null)}/>}
      {showGoogleSetup && <GoogleSetupModal onClose={()=>setShowGoogleSetup(false)} onConnect={connectGoogle}/>}
      <Header>
        {googleEmail
          ? <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.12)",padding:"5px 12px",borderRadius:20}}>
              <span style={{fontSize:18}}>🔒</span>
              <div><div style={{fontSize:11,fontWeight:600,color:"white"}}>{googleEmail}</div><div style={{fontSize:9,opacity:.7,color:"white"}}>Google Drive connected</div></div>
              <button className="btn btn-sm" style={{background:"rgba(255,255,255,.15)",color:"white",border:"none",padding:"2px 8px",borderRadius:10,fontSize:10,cursor:"pointer"}} onClick={disconnectGoogle}>Disconnect</button>
            </div>
          : <button className="btn btn-outline" style={{color:"white",borderColor:"rgba(255,255,255,.4)",display:"flex",alignItems:"center",gap:6}} onClick={()=>setShowGoogleSetup(true)}>
              <span style={{fontSize:14}}>🔗</span> Connect Google Drive
            </button>
        }
      </Header>
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">Dashboard</div>
            <div className="page-sub">Data saved locally in your browser</div>
          </div>
          <button className="btn btn-gold btn-lg" onClick={()=>setBankModal("new")}>+ Add Bank / Client</button>
        </div>
        <div className="stats">
          <div className="stat-card"><div className="stat-num">{banks.length}</div><div className="stat-label">Banks / Clients</div></div>
          <div className="stat-card"><div className="stat-num">{valuations.length}</div><div className="stat-label">Total Valuations</div></div>
          <div className="stat-card" style={{borderColor:"#c9921a"}}><div className="stat-num" style={{color:"#a87816"}}>{valuations.filter(v=>v.status==="pending").length}</div><div className="stat-label">Pending</div></div>
          <div className="stat-card" style={{borderColor:"#3d6b5a"}}><div className="stat-num" style={{color:"#3d6b5a"}}>{valuations.filter(v=>v.status==="done").length}</div><div className="stat-label">Completed</div></div>
        </div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--ink2)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:13}}>Banks and Clients</div>
        <div className="banks-grid">
          {banks.map(b=>{
            const cnt = valuations.filter(v=>v.bankId===b.id).length;
            const done = valuations.filter(v=>v.bankId===b.id&&v.status==="done").length;
            const tmpl = TEMPLATES.find(t=>t.id===b.reportTemplate);
            return (
              <div key={b.id} className="bank-card" onClick={()=>{setSelBank(b);setView("bank");}}>
                <div className="bank-card-header" style={{background:"linear-gradient(135deg,"+b.color+","+b.color+"bb)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>🏦</div>
                  <div className="bank-card-name">{b.name}</div>
                  <div className="bank-card-branch">{b.branch}</div>
                  <div style={{marginTop:5,fontSize:10,opacity:.75,background:"rgba(255,255,255,.15)",borderRadius:12,padding:"2px 8px",display:"inline-block"}}>{tmpl?.label||"Sectional"}</div>
                </div>
                <div style={{padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,color:"var(--ink2)"}}><strong style={{color:b.color,fontSize:15,fontFamily:"'Playfair Display',serif"}}>{cnt}</strong> valuation{cnt!==1?"s":""}  <strong style={{color:"var(--sage)"}}>{done}</strong> done</div>
                  <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-outline btn-sm" onClick={()=>setBankModal(b)}>Configure</button>
                    <button className="btn btn-sm" style={{background:"#fff0f0",color:"#dc3545",border:"1px solid #f5c2c7"}} onClick={()=>delBank(b.id)}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="add-bank-card" onClick={()=>setBankModal("new")}>
            <div style={{fontSize:28,color:"var(--gold)"}}>+</div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--ink2)"}}>Add New Bank / Client</div>
          </div>
        </div>
      </div>
    </div>
  );
}
