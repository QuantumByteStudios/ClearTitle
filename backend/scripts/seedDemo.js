// scripts/seedDemo.js
// Demo registry for prototype presentations.
// Replaces users, lands, transfers, documents, notifications, and audit logs.
//
//   npm run seed
//
// Wallets are the public Hardhat test accounts (mnemonic: test test ... junk)
// so they can be imported into MetaMask. Account #0 is the presenter wallet.

const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const { Mnemonic, HDNodeWallet, parseEther } = require("ethers");

const User = require("../models/User");
const Land = require("../models/Land");
const Transfer = require("../models/Transfer");
const Document = require("../models/Document");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");

const MNEMONIC = "test test test test test test test test test test test junk";

function account(index) {
  const wallet = HDNodeWallet.fromMnemonic(
    Mnemonic.fromPhrase(MNEMONIC),
    `m/44'/60'/0'/0/${index}`
  );
  return {
    index,
    address: wallet.address.toLowerCase(),
    privateKey: wallet.privateKey,
  };
}

const A = {
  meera: account(0),
  vikram: account(1),
  ananya: account(2),
  rohan: account(3),
  kabir: account(4),
  sneha: account(5),
  arjun: account(6),
  fatima: account(7),
  dev: account(8),
  nisha: account(9),
  harish: account(10),
  lakshmi: account(11),
  imran: account(12),
  priya: account(13),
};

const eth = (amount) => parseEther(String(amount)).toString();
const at = (iso) => new Date(iso);

function digest(label) {
  return crypto.createHash("sha256").update(label).digest("hex");
}

function tx(label) {
  return `0x${digest(`tx:${label}`)}`;
}

function cid(label) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  const hash = Buffer.from(digest(`cid:${label}`), "hex");
  let out = "bafybei";
  for (let i = 0; i < 52; i += 1) out += alphabet[hash[i % hash.length] % alphabet.length];
  return out;
}

function block(n) {
  return 28940210 + n;
}

const PEOPLE = [
  { key: "meera", name: "Meera Krishnan", email: "meera.krishnan@krishnanestates.in", role: "seller", kycStatus: "verified", lastLoginAt: at("2026-10-22T09:40:00+05:30") },
  { key: "vikram", name: "Vikram Deshmukh", email: "vikram.deshmukh@igr.karnataka.gov.in", role: "admin", kycStatus: "verified", lastLoginAt: at("2026-10-23T08:15:00+05:30") },
  { key: "ananya", name: "Ananya Reddy", email: "ananya.reddy@reddyholdings.com", role: "seller", kycStatus: "verified", lastLoginAt: at("2026-10-21T16:05:00+05:30") },
  { key: "rohan", name: "Rohan Malhotra", email: "rohan.malhotra@malhotrarealty.in", role: "seller", kycStatus: "verified", lastLoginAt: at("2026-10-20T11:22:00+05:30") },
  { key: "kabir", name: "Kabir Shah", email: "kabir.shah@gmail.com", role: "buyer", kycStatus: "verified", lastLoginAt: at("2026-10-22T19:10:00+05:30") },
  { key: "sneha", name: "Sneha Iyer", email: "sneha.iyer@outlook.com", role: "buyer", kycStatus: "verified", lastLoginAt: at("2026-10-19T14:48:00+05:30") },
  { key: "arjun", name: "Arjun Patel", email: "arjun.patel@patelbrothers.co", role: "seller", kycStatus: "verified", lastLoginAt: at("2026-09-30T10:00:00+05:30") },
  { key: "fatima", name: "Fatima Qureshi", email: "fatima.qureshi@gmail.com", role: "buyer", kycStatus: "verified", lastLoginAt: at("2026-10-18T12:30:00+05:30") },
  { key: "dev", name: "Dev Sharma", email: "dev.sharma@yahoo.com", role: "public", kycStatus: "pending", lastLoginAt: at("2026-10-17T18:05:00+05:30") },
  { key: "nisha", name: "Nisha Kulkarni", email: "nisha.kulkarni@nkassets.in", role: "seller", kycStatus: "verified", lastLoginAt: at("2026-10-15T09:12:00+05:30") },
  { key: "harish", name: "Harish Rao", email: "harish.rao@gmail.com", role: "buyer", kycStatus: "pending", lastLoginAt: at("2026-08-02T11:00:00+05:30") },
  { key: "lakshmi", name: "Lakshmi Narayan", email: "lakshmi.narayan@gmail.com", role: "public", kycStatus: "rejected", lastLoginAt: at("2026-07-11T15:40:00+05:30") },
  { key: "imran", name: "Imran Khan", email: "imran.khan@himalayaconstructions.in", role: "seller", kycStatus: "verified", lastLoginAt: at("2026-06-20T13:18:00+05:30") },
  { key: "priya", name: "Priya Menon", email: "priya.menon@gmail.com", role: "buyer", kycStatus: "verified", lastLoginAt: at("2026-06-09T17:45:00+05:30") },
];

const PARCELS = [
  {
    landId: 1,
    surveyNumber: "45/2A · Khata 128",
    area: 223,
    location: "Plot 14, Palm Meadows, Whitefield, Bengaluru, Karnataka 560066",
    owner: "meera",
    price: 18.5,
    status: "VERIFIED",
    isListedForSale: true,
    createdAt: at("2026-05-12T11:20:00+05:30"),
    deed: "Sale_Deed_Sy_45_2A_Whitefield.pdf",
  },
  {
    landId: 2,
    surveyNumber: "PID 27-445-1204",
    area: 148,
    location: "Flat 1204, Tower B, Prestige Lakeside Habitat, Varthur, Bengaluru, Karnataka 560087",
    owner: "meera",
    price: 12.4,
    status: "VERIFIED",
    isListedForSale: true,
    createdAt: at("2026-06-02T10:05:00+05:30"),
    deed: "Sale_Deed_Flat_1204_Lakeside_Habitat.pdf",
  },
  {
    landId: 3,
    surveyNumber: "112/1 · Khata 904",
    area: 167,
    location: "27th Main, HSR Layout Sector 2, Bengaluru, Karnataka 560102",
    owner: "meera",
    price: 22,
    status: "VERIFIED",
    isListedForSale: false,
    createdAt: at("2026-04-18T15:40:00+05:30"),
    deed: "Sale_Deed_Sy_112_1_HSR_Layout.pdf",
  },
  {
    landId: 4,
    surveyNumber: "88/3B · Khata 551",
    area: 190,
    location: "Neeladri Road, Electronic City Phase 1, Bengaluru, Karnataka 560100",
    owner: "meera",
    price: 15.75,
    status: "PENDING",
    isListedForSale: false,
    createdAt: at("2026-10-18T09:30:00+05:30"),
    deed: "Sale_Deed_Sy_88_3B_Electronic_City.pdf",
  },
  {
    landId: 5,
    surveyNumber: "214 · Hissa 3",
    area: 4047,
    location: "Survey 214, Vijayapura Village, Devanahalli, Bengaluru Rural, Karnataka 562110",
    owner: "meera",
    price: 9.75,
    status: "VERIFIED",
    isListedForSale: true,
    createdAt: at("2026-07-02T12:10:00+05:30"),
    deed: "Title_Deed_Sy_214_Devanahalli.pdf",
  },
  {
    landId: 6,
    surveyNumber: "19/4 · Khata 332",
    area: 204,
    location: "11th Main, Jayanagar 4th Block, Bengaluru, Karnataka 560011",
    owner: "meera",
    price: 28,
    status: "DISPUTED",
    isListedForSale: false,
    createdAt: at("2026-08-09T14:25:00+05:30"),
    deed: "Sale_Deed_Sy_19_4_Jayanagar.pdf",
  },
  {
    landId: 7,
    surveyNumber: "CTS 842/B",
    area: 186,
    location: "14 Pali Hill Road, Bandra West, Mumbai, Maharashtra 400050",
    owner: "ananya",
    price: 64,
    status: "VERIFIED",
    isListedForSale: true,
    createdAt: at("2026-05-20T16:00:00+05:30"),
    deed: "Indenture_CTS_842B_Pali_Hill.pdf",
  },
  {
    landId: 8,
    surveyNumber: "61/2 · CTS 2201",
    area: 312,
    location: "Survey 61/2, Eon Free Zone, Kharadi, Pune, Maharashtra 411014",
    owner: "ananya",
    price: 19.6,
    status: "PENDING",
    isListedForSale: false,
    createdAt: at("2026-10-20T11:45:00+05:30"),
    deed: "Agreement_to_Sell_Sy_61_2_Kharadi.pdf",
  },
  {
    landId: 9,
    surveyNumber: "7/1 · Khata 88",
    area: 418,
    location: "Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033",
    owner: "ananya",
    price: 41.25,
    status: "FROZEN",
    isListedForSale: false,
    createdAt: at("2026-03-14T10:15:00+05:30"),
    deed: "Sale_Deed_Sy_7_1_Jubilee_Hills.pdf",
  },
  {
    landId: 10,
    surveyNumber: "DLF-II/22 · Khasra 48/14",
    area: 250,
    location: "Plot 22, DLF Phase 2, Gurugram, Haryana 122002",
    owner: "rohan",
    price: 31,
    status: "VERIFIED",
    isListedForSale: true,
    createdAt: at("2026-06-01T13:20:00+05:30"),
    deed: "Conveyance_Plot_22_DLF_Phase_2.pdf",
  },
  {
    landId: 11,
    surveyNumber: "903 · Sector 150",
    area: 162,
    location: "Pocket C, Sector 150, Noida, Gautam Buddha Nagar, Uttar Pradesh 201310",
    owner: "rohan",
    price: 7.8,
    status: "REJECTED",
    isListedForSale: false,
    rejectionReason: "Mutation extract does not match the sale deed. Khata 903 still shows an undischarged charge in favour of HDFC Bank, and the encumbrance certificate from 01 Jan 2020 to 22 Oct 2026 records an open lis pendens.",
    createdAt: at("2026-09-11T10:50:00+05:30"),
    deed: "Sale_Deed_Sy_903_Sector_150_Noida.pdf",
  },
  {
    landId: 12,
    surveyNumber: "GW-C-1402",
    area: 156,
    location: "Flat 1402, Godrej Woods, Sector 43, Noida, Uttar Pradesh 201301",
    owner: "rohan",
    price: 8.2,
    status: "VERIFIED",
    isListedForSale: true,
    createdAt: at("2026-07-19T09:40:00+05:30"),
    deed: "Apartment_Deed_Godrej_Woods_1402.pdf",
  },
  {
    landId: 13,
    surveyNumber: "78/6A · Khata 441",
    area: 139,
    location: "4th Block, Koramangala, Bengaluru, Karnataka 560034",
    owner: "kabir",
    price: 16.9,
    status: "VERIFIED",
    isListedForSale: false,
    createdAt: at("2026-05-30T11:05:00+05:30"),
    deed: "Sale_Deed_Sy_78_6A_Koramangala.pdf",
  },
  {
    landId: 14,
    surveyNumber: "TS 92/1 · Door 18",
    area: 178,
    location: "2nd Avenue, Anna Nagar, Chennai, Tamil Nadu 600040",
    owner: "sneha",
    price: 11.35,
    status: "VERIFIED",
    isListedForSale: false,
    createdAt: at("2026-04-12T16:30:00+05:30"),
    deed: "Sale_Deed_TS_92_1_Anna_Nagar.pdf",
  },
  {
    landId: 15,
    surveyNumber: "246/8",
    area: 201,
    location: "Panampilly Nagar, Ernakulam, Kochi, Kerala 682036",
    owner: "fatima",
    price: 6.4,
    status: "PENDING",
    isListedForSale: false,
    createdAt: at("2026-10-21T15:10:00+05:30"),
    deed: "Sale_Deed_Sy_246_8_Panampilly_Nagar.pdf",
  },
  {
    landId: 16,
    surveyNumber: "142/55 · Khasra 210",
    area: 265,
    location: "C-Scheme, Ashok Marg, Jaipur, Rajasthan 302001",
    owner: "arjun",
    price: 5.9,
    status: "VERIFIED",
    isListedForSale: true,
    createdAt: at("2026-05-03T12:00:00+05:30"),
    deed: "Patta_Khasra_210_C_Scheme_Jaipur.pdf",
  },
  {
    landId: 17,
    surveyNumber: "AE-214 · Bidhannagar",
    area: 134,
    location: "Block AE, Salt Lake Sector I, Kolkata, West Bengal 700064",
    owner: "dev",
    price: 4.15,
    status: "REJECTED",
    isListedForSale: false,
    rejectionReason: "Seller name on the January 2026 sale deed does not match the record of rights. The chain of title skips the 2019 mutation, and the uploaded PAN does not match the applicant KYC.",
    createdAt: at("2026-09-02T14:20:00+05:30"),
    deed: "Deed_AE_214_Salt_Lake_Kolkata.pdf",
  },
  {
    landId: 18,
    surveyNumber: "PID 76-12-88",
    area: 92,
    location: "Unit 4, Prestige Towers, MG Road, Bengaluru, Karnataka 560001",
    owner: "nisha",
    price: 27.5,
    status: "VERIFIED",
    isListedForSale: true,
    createdAt: at("2026-03-02T11:30:00+05:30"),
    deed: "Commercial_Conveyance_MG_Road_Unit_4.pdf",
  },
  {
    landId: 19,
    surveyNumber: "12/7B · Khata 77",
    area: 121,
    location: "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
    owner: "kabir",
    price: 14.2,
    status: "VERIFIED",
    isListedForSale: false,
    createdAt: at("2026-08-28T10:40:00+05:30"),
    deed: "Sale_Deed_Sy_12_7B_Indiranagar.pdf",
  },
  {
    landId: 20,
    surveyNumber: "118/4",
    area: 188,
    location: "Baner Road, Baner, Pune, Maharashtra 411045",
    owner: "sneha",
    price: 9.1,
    status: "VERIFIED",
    isListedForSale: false,
    createdAt: at("2026-09-04T13:55:00+05:30"),
    deed: "Sale_Deed_Sy_118_4_Baner.pdf",
  },
];

const TRANSFERS = [
  { landId: 16, from: "harish", to: "arjun", price: 5.2, state: "APPROVED", initiatedAt: at("2026-05-02T10:00:00+05:30"), approvedAt: at("2026-05-06T15:20:00+05:30") },
  { landId: 18, from: "imran", to: "nisha", price: 24, state: "APPROVED", initiatedAt: at("2026-05-08T11:30:00+05:30"), approvedAt: at("2026-05-14T16:10:00+05:30") },
  { landId: 10, from: "priya", to: "rohan", price: 29, state: "APPROVED", initiatedAt: at("2026-06-03T09:40:00+05:30"), approvedAt: at("2026-06-09T12:25:00+05:30") },
  { landId: 2, from: "arjun", to: "meera", price: 11.8, state: "APPROVED", initiatedAt: at("2026-06-11T14:15:00+05:30"), buyerAcceptedAt: at("2026-06-12T10:05:00+05:30"), approvedAt: at("2026-06-16T17:40:00+05:30") },
  { landId: 1, from: "meera", to: "kabir", price: 18.5, state: "CANCELLED", initiatedAt: at("2026-06-20T11:00:00+05:30"), cancelledAt: at("2026-06-22T18:30:00+05:30"), rejectionReason: "Buyer withdrew before acceptance. Token amount was not placed." },
  { landId: 3, from: "dev", to: "meera", price: 20.4, state: "APPROVED", initiatedAt: at("2026-07-04T10:20:00+05:30"), buyerAcceptedAt: at("2026-07-05T12:00:00+05:30"), approvedAt: at("2026-07-09T15:45:00+05:30") },
  { landId: 14, from: "fatima", to: "sneha", price: 10.5, state: "APPROVED", initiatedAt: at("2026-07-08T13:10:00+05:30"), buyerAcceptedAt: at("2026-07-09T09:30:00+05:30"), approvedAt: at("2026-07-15T16:20:00+05:30") },
  { landId: 7, from: "ananya", to: "kabir", price: 58, state: "REJECTED", initiatedAt: at("2026-07-18T11:40:00+05:30"), buyerAcceptedAt: at("2026-07-19T10:15:00+05:30"), rejectedAt: at("2026-07-20T14:50:00+05:30"), rejectionReason: "Declared consideration is below the ready-reckoner circle rate for CTS 842/B. Ask the parties to revise the deed or produce the valuation report." },
  { landId: 13, from: "meera", to: "kabir", price: 16.9, state: "APPROVED", initiatedAt: at("2026-08-12T10:30:00+05:30"), buyerAcceptedAt: at("2026-08-13T16:00:00+05:30"), approvedAt: at("2026-08-21T11:35:00+05:30") },
  { landId: 9, from: "ananya", to: "rohan", price: 41.25, state: "CANCELLED", initiatedAt: at("2026-08-02T12:10:00+05:30"), cancelledAt: at("2026-08-04T09:20:00+05:30"), rejectionReason: "Cancelled after the City Civil Court, Hyderabad granted an interim stay in OS 418/2026." },
  { landId: 16, from: "arjun", to: "fatima", price: 6.1, state: "REJECTED", initiatedAt: at("2026-08-26T15:00:00+05:30"), buyerAcceptedAt: at("2026-08-27T11:10:00+05:30"), rejectedAt: at("2026-08-28T13:40:00+05:30"), rejectionReason: "Buyer KYC name does not match the PAN on the draft sale deed." },
  { landId: 6, from: "meera", to: "arjun", price: 28, state: "REJECTED", initiatedAt: at("2026-09-03T10:45:00+05:30"), buyerAcceptedAt: at("2026-09-04T12:30:00+05:30"), rejectedAt: at("2026-09-08T16:15:00+05:30"), rejectionReason: "Adjacent khata holder of Sy. No. 19/5 has reported a boundary overlap. Transfer stayed until the survey department sketch is filed." },
  { landId: 20, from: "ananya", to: "sneha", price: 9.1, state: "APPROVED", initiatedAt: at("2026-09-12T11:25:00+05:30"), buyerAcceptedAt: at("2026-09-14T09:50:00+05:30"), approvedAt: at("2026-09-24T15:05:00+05:30") },
  { landId: 19, from: "nisha", to: "kabir", price: 14.2, state: "APPROVED", initiatedAt: at("2026-09-18T14:00:00+05:30"), buyerAcceptedAt: at("2026-09-19T10:40:00+05:30"), approvedAt: at("2026-10-02T12:55:00+05:30") },
  { landId: 12, from: "rohan", to: "meera", price: 8.2, state: "BUYER_ACCEPTED", initiatedAt: at("2026-10-04T10:15:00+05:30"), buyerAcceptedAt: at("2026-10-10T18:20:00+05:30") },
  { landId: 7, from: "ananya", to: "sneha", price: 64, state: "BUYER_ACCEPTED", initiatedAt: at("2026-10-06T12:40:00+05:30"), buyerAcceptedAt: at("2026-10-11T09:05:00+05:30") },
  { landId: 10, from: "rohan", to: "meera", price: 31, state: "INITIATED", initiatedAt: at("2026-10-15T16:30:00+05:30") },
  { landId: 5, from: "meera", to: "kabir", price: 9.75, state: "INITIATED", initiatedAt: at("2026-10-19T11:50:00+05:30") },
];

function users() {
  return PEOPLE.map((person) => ({
    walletAddress: A[person.key].address,
    name: person.name,
    email: person.email,
    role: person.role,
    kycStatus: person.kycStatus,
    lastLoginAt: person.lastLoginAt,
    createdAt: at("2026-02-10T10:00:00+05:30"),
    updatedAt: person.lastLoginAt,
  }));
}

function lands() {
  return PARCELS.map((parcel) => {
    const hash = cid(`land-${parcel.landId}`);
    return {
      landId: parcel.landId,
      surveyNumber: parcel.surveyNumber,
      area: parcel.area,
      location: parcel.location,
      ownerAddress: A[parcel.owner].address,
      price: eth(parcel.price),
      ipfsHash: hash,
      status: parcel.status,
      txHash: tx(`register-${parcel.landId}`),
      blockNumber: block(parcel.landId * 17),
      rejectionReason: parcel.rejectionReason || "",
      isListedForSale: parcel.isListedForSale,
      createdAt: parcel.createdAt,
      updatedAt: parcel.createdAt,
    };
  });
}

function transfers() {
  return TRANSFERS.map((item, index) => {
    const doc = {
      landId: item.landId,
      fromAddress: A[item.from].address,
      toAddress: A[item.to].address,
      price: eth(item.price),
      state: item.state,
      rejectionReason: item.rejectionReason || "",
      initiatedTxHash: tx(`init-${item.landId}-${index}`),
      initiatedBlock: block(400 + index),
      initiatedAt: item.initiatedAt,
      createdAt: item.initiatedAt,
      updatedAt: item.approvedAt || item.rejectedAt || item.cancelledAt || item.buyerAcceptedAt || item.initiatedAt,
    };
    if (item.buyerAcceptedAt) {
      doc.acceptedTxHash = tx(`accept-${item.landId}-${index}`);
      doc.buyerAcceptedAt = item.buyerAcceptedAt;
    }
    if (item.approvedAt) {
      doc.approvedTxHash = tx(`approve-${item.landId}-${index}`);
      doc.approvedBlock = block(700 + index);
      doc.approvedAt = item.approvedAt;
    }
    if (item.rejectedAt) {
      doc.rejectedTxHash = tx(`reject-${item.landId}-${index}`);
      doc.rejectedAt = item.rejectedAt;
    }
    if (item.cancelledAt) {
      doc.cancelledTxHash = tx(`cancel-${item.landId}-${index}`);
      doc.cancelledAt = item.cancelledAt;
    }
    return doc;
  });
}

function documents(landDocs) {
  const rows = [];
  for (const parcel of PARCELS) {
    const land = landDocs.find((item) => item.landId === parcel.landId);
    const uploadedAt = parcel.createdAt;
    rows.push({
      landId: parcel.landId,
      fileName: parcel.deed,
      originalName: parcel.deed,
      mimeType: "application/pdf",
      fileSize: 240_000 + parcel.landId * 37_413,
      sha256Hash: digest(`deed:${parcel.landId}`),
      ipfsHash: land.ipfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${land.ipfsHash}`,
      uploadedBy: A[parcel.owner].address,
      status: "active",
      createdAt: uploadedAt,
      updatedAt: uploadedAt,
    });
  }

  const extras = [
    { landId: 1, fileName: "Encumbrance_Certificate_45_2A_2020_2026.pdf", status: "active", by: "meera", when: at("2026-05-11T09:00:00+05:30") },
    { landId: 4, fileName: "Khata_Extract_551_Electronic_City.pdf", status: "active", by: "meera", when: at("2026-10-17T16:20:00+05:30") },
    { landId: 6, fileName: "Tippan_Sketch_Sy_19_4_Jayanagar.pdf", status: "active", by: "meera", when: at("2026-09-06T11:15:00+05:30") },
    { landId: 9, fileName: "Court_Stay_OS_418_2026_Hyderabad.pdf", status: "active", by: "ananya", when: at("2026-08-04T10:00:00+05:30") },
    { landId: 11, fileName: "EC_Sector_150_Noida_superseded.pdf", status: "superseded", by: "rohan", when: at("2026-09-09T12:40:00+05:30") },
  ];

  for (const extra of extras) {
    const hash = cid(`doc-${extra.landId}-${extra.fileName}`);
    rows.push({
      landId: extra.landId,
      fileName: extra.fileName,
      originalName: extra.fileName,
      mimeType: "application/pdf",
      fileSize: 180_000 + extra.fileName.length * 1400,
      sha256Hash: digest(`extra:${extra.fileName}`),
      ipfsHash: hash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${hash}`,
      uploadedBy: A[extra.by].address,
      status: extra.status,
      createdAt: extra.when,
      updatedAt: extra.when,
    });
  }
  return rows;
}

function notifications() {
  const rows = [
    ["meera", "Offer received for DLF Phase 2", "Rohan Malhotra initiated a transfer of Plot 22, DLF Phase 2, Gurugram to your wallet at 31 ETH. Review and accept it from the buyer dashboard.", "TRANSFER_INITIATED", 10, "/buyer", false, at("2026-10-15T16:32:00+05:30")],
    ["meera", "Registrar review in progress", "You accepted the transfer of Flat 1402, Godrej Woods, Noida at 8.2 ETH. Sub-Registrar Vikram Deshmukh still has to sign off.", "SYSTEM", 12, "/buyer", false, at("2026-10-10T18:22:00+05:30")],
    ["meera", "Jayanagar parcel marked disputed", "Sy. No. 19/4, Khata 332 is disputed after the adjoining khata holder reported a boundary overlap. A fresh tippan sketch is on the file.", "SYSTEM", 6, "/lands/6", false, at("2026-09-08T16:20:00+05:30")],
    ["meera", "Devanahalli title verified", "Survey 214, Vijayapura Village, Devanahalli (1 acre) is verified and can be offered for transfer.", "LAND_VERIFIED", 5, "/lands/5", true, at("2026-07-06T11:00:00+05:30")],
    ["meera", "Whitefield plot verified", "Sy. No. 45/2A, Khata 128, Palm Meadows, Whitefield is now on the public registry.", "LAND_VERIFIED", 1, "/lands/1", true, at("2026-05-14T12:10:00+05:30")],
    ["meera", "Koramangala sale completed", "Transfer of Sy. No. 78/6A, Koramangala to Kabir Shah was approved. Ownership has moved.", "TRANSFER_APPROVED", 13, "/lands/13", true, at("2026-08-21T11:40:00+05:30")],
    ["kabir", "Offer for Devanahalli acreage", "Meera Krishnan offered Survey 214, Vijayapura Village to you at 9.75 ETH. Accept the offer to send it to the registrar.", "TRANSFER_INITIATED", 5, "/buyer", false, at("2026-10-19T11:52:00+05:30")],
    ["kabir", "Indiranagar purchase recorded", "Sy. No. 12/7B, 100 Feet Road, Indiranagar is now in your name. The approved transfer is on the public record.", "TRANSFER_APPROVED", 19, "/lands/19", true, at("2026-10-02T13:00:00+05:30")],
    ["kabir", "Koramangala khata updated", "Sy. No. 78/6A, 4th Block, Koramangala was transferred to you from Meera Krishnan at 16.9 ETH.", "TRANSFER_APPROVED", 13, "/lands/13", true, at("2026-08-21T11:42:00+05:30")],
    ["sneha", "Bandra acceptance is with the registrar", "Your acceptance of CTS 842/B, Pali Hill, Bandra West at 64 ETH is waiting for sub-registrar approval.", "SYSTEM", 7, "/buyer", false, at("2026-10-11T09:08:00+05:30")],
    ["sneha", "Anna Nagar deed registered", "TS 92/1, Door 18, 2nd Avenue, Anna Nagar was transferred from Fatima Qureshi and marked verified.", "TRANSFER_APPROVED", 14, "/lands/14", true, at("2026-07-15T16:25:00+05:30")],
    ["ananya", "Buyer accepted Pali Hill", "Sneha Iyer accepted the transfer of CTS 842/B, Bandra West at 64 ETH. It is queued for registrar sign-off.", "TRANSFER_ACCEPTED", 7, "/seller", false, at("2026-10-11T09:06:00+05:30")],
    ["ananya", "Jubilee Hills title frozen", "Sy. No. 7/1, Road No. 36, Jubilee Hills is frozen under the interim stay in OS 418/2026 before the City Civil Court, Hyderabad.", "LAND_FROZEN", 9, "/lands/9", false, at("2026-08-04T10:05:00+05:30")],
    ["ananya", "Earlier Bandra sale was refused", "The July transfer of CTS 842/B to Kabir Shah was rejected because the price was below the circle rate.", "TRANSFER_REJECTED", 7, "/lands/7", true, at("2026-07-20T14:55:00+05:30")],
    ["rohan", "Meera accepted Godrej Woods", "Meera Krishnan accepted Flat 1402, Godrej Woods at 8.2 ETH. Waiting on the sub-registrar.", "TRANSFER_ACCEPTED", 12, "/seller", false, at("2026-10-10T18:21:00+05:30")],
    ["rohan", "Sector 150 application refused", "Sy. No. 903, Pocket C, Sector 150, Noida was rejected. The encumbrance certificate still shows an open bank charge and a lis pendens.", "LAND_REJECTED", 11, "/lands/11", true, at("2026-09-12T11:30:00+05:30")],
    ["vikram", "Two transfers need sign-off", "CTS 842/B, Bandra West and Flat 1402, Godrej Woods have been accepted by the buyers and are waiting in your approval queue.", "SYSTEM", null, "/admin", false, at("2026-10-11T09:10:00+05:30")],
    ["vikram", "Electronic City deed is ageing", "Sy. No. 88/3B, Khata 551, Electronic City Phase 1 has been pending verification since 18 Oct 2026.", "SYSTEM", 4, "/lands/4", false, at("2026-10-22T08:30:00+05:30")],
    ["fatima", "Kochi application received", "Sy. No. 246/8, Panampilly Nagar is in the registrar queue. You will be notified when it is verified or sent back.", "SYSTEM", 15, "/lands/15", false, at("2026-10-21T15:12:00+05:30")],
    ["dev", "Salt Lake application refused", "AE-214, Bidhannagar was rejected. The sale deed name does not match the record of rights, and the PAN does not match your KYC.", "LAND_REJECTED", 17, "/lands/17", false, at("2026-09-03T10:00:00+05:30")],
  ];

  return rows.map(([user, title, message, type, landId, link, read, createdAt]) => ({
    userAddress: A[user].address,
    title,
    message,
    type,
    landId,
    link,
    read,
    readAt: read ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
  }));
}

function auditLogs() {
  const by = A.vikram.address;
  const rows = [
    ["LAND_VERIFIED", 1, "meera", at("2026-05-14T12:08:00+05:30"), { circleOffice: "Bengaluru East", note: "EC clear. Khata 128 matches the sale deed." }],
    ["LAND_VERIFIED", 16, "arjun", at("2026-05-06T15:22:00+05:30"), { circleOffice: "Jaipur", note: "Patta and khasra 210 reconciled." }],
    ["TRANSFER_APPROVED", 18, "nisha", at("2026-05-14T16:12:00+05:30"), { considerationEth: "24", stampDuty: "Paid at Gandhinagar SR" }],
    ["USER_KYC_APPROVED", null, "meera", at("2026-05-02T09:30:00+05:30"), { document: "Aadhaar + PAN", officer: "Vikram Deshmukh" }],
    ["USER_KYC_APPROVED", null, "ananya", at("2026-05-18T11:00:00+05:30"), { document: "Aadhaar + PAN" }],
    ["TRANSFER_APPROVED", 2, "meera", at("2026-06-16T17:42:00+05:30"), { considerationEth: "11.8", from: "Arjun Patel" }],
    ["TRANSFER_APPROVED", 3, "meera", at("2026-07-09T15:48:00+05:30"), { considerationEth: "20.4" }],
    ["TRANSFER_REJECTED", 7, "ananya", at("2026-07-20T14:52:00+05:30"), { reason: "Below circle rate for CTS 842/B" }],
    ["LAND_FROZEN", 9, "ananya", at("2026-08-04T10:02:00+05:30"), { caseNumber: "OS 418/2026", court: "City Civil Court, Hyderabad" }],
    ["TRANSFER_APPROVED", 13, "kabir", at("2026-08-21T11:36:00+05:30"), { considerationEth: "16.9", from: "Meera Krishnan" }],
    ["USER_KYC_REJECTED", null, "lakshmi", at("2026-07-11T15:42:00+05:30"), { reason: "Address proof older than 3 months" }],
    ["LAND_DISPUTED", 6, "meera", at("2026-09-08T16:16:00+05:30"), { reason: "Boundary overlap with Sy. No. 19/5" }],
    ["LAND_REJECTED", 11, "rohan", at("2026-09-12T11:28:00+05:30"), { reason: "Undischarged HDFC charge and open lis pendens" }],
    ["LAND_REJECTED", 17, "dev", at("2026-09-03T09:55:00+05:30"), { reason: "Name mismatch with record of rights" }],
    ["TRANSFER_APPROVED", 20, "sneha", at("2026-09-24T15:08:00+05:30"), { considerationEth: "9.1" }],
    ["TRANSFER_APPROVED", 19, "kabir", at("2026-10-02T12:57:00+05:30"), { considerationEth: "14.2", from: "Nisha Kulkarni" }],
    ["EXPORT_GENERATED", null, null, at("2026-10-16T17:05:00+05:30"), { format: "CSV", scope: "all lands", requestedBy: "Registrar weekly extract" }],
  ];

  return rows.map(([action, landId, target, createdAt, metadata], index) => ({
    performedBy: by,
    action,
    landId,
    targetAddress: target ? A[target].address : null,
    txHash: landId ? tx(`audit-${action}-${landId}-${index}`) : null,
    blockNumber: landId ? block(900 + index) : null,
    metadata,
    ipAddress: index % 2 === 0 ? "49.207.48.22" : "103.25.231.44",
    createdAt,
    updatedAt: createdAt,
  }));
}

async function connect() {
  const uri = process.env.MONGODB_URI;
  const connectionString = !uri || uri.includes("cluster0.xxxxx.mongodb.net")
    ? "mongodb://127.0.0.1:27017/landregistry"
    : uri;

  await mongoose.connect(connectionString, { serverSelectionTimeoutMS: 8000 });
  return connectionString.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

async function main() {
  const where = await connect();
  console.log(`Connected: ${where}`);

  await Promise.all([
    User.deleteMany({}),
    Land.deleteMany({}),
    Transfer.deleteMany({}),
    Document.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const landDocs = lands();
  await User.insertMany(users());
  await Land.insertMany(landDocs);
  await Transfer.insertMany(transfers());
  await Document.insertMany(documents(landDocs));
  await Notification.insertMany(notifications());
  await AuditLog.insertMany(auditLogs());

  const [userCount, landCount, transferCount, pendingLands, pendingTransfers] = await Promise.all([
    User.countDocuments(),
    Land.countDocuments(),
    Transfer.countDocuments(),
    Land.countDocuments({ status: "PENDING" }),
    Transfer.countDocuments({ state: "BUYER_ACCEPTED" }),
  ]);

  console.log("");
  console.log(`Seeded ${landCount} parcels, ${transferCount} transfers, ${userCount} people.`);
  console.log(`Registrar queue: ${pendingLands} deeds pending, ${pendingTransfers} transfers awaiting sign-off.`);
  console.log("");
  console.log("Import a Hardhat test account in MetaMask, then pick the role on the login screen.");
  console.log("Account #0 fills the seller dashboard and also has incoming buyer offers.");
  console.log("");
  for (const person of PEOPLE.slice(0, 5)) {
    const wallet = A[person.key];
    console.log(
      `#${wallet.index}  ${person.name.padEnd(18)} ${person.role.padEnd(7)} ${wallet.address}`
    );
    console.log(`     ${wallet.privateKey}`);
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
