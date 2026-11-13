#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enrich public/data/egyptian-drugs.json for Al-Yusr Pharmacy.

  1) names   Rebuild `commercial_name_ar` so it reads like a pharmacy shelf label:
             transliterated brand + strength + a proper Arabic dosage-form phrase
             (e.g. "إيي" -> "قطرة للعين", "سوبب" -> "لبوس", "سواب" -> "صابون").
  2) images  Add `image_url` for every product in the database: well-known brands first,
             then the rest in file order. Rows that already have a valid `image_url` are
             skipped (image search with rate limiting, timeouts, validation, incremental saves).

Usage (from the project root):
    python scripts/enrich_drugs.py names --dry-run 40    # preview, writes nothing
    python scripts/enrich_drugs.py names                 # rewrite Arabic names
    python scripts/enrich_drugs.py images                # fetch images for the whole database
    python scripts/enrich_drugs.py images --limit 250    # ...or only the next 250 products
    python scripts/enrich_drugs.py all

Safe to re-run: the untouched original is kept in scripts/backup/ and Arabic names are
always rebuilt from it; image progress is saved after every 50 new images and resumed next
time (the full database takes many hours — stop with Ctrl+C and re-run whenever you like).
"""
from __future__ import annotations

import argparse
import html
import json
import os
import random
import re
import shutil
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data" / "egyptian-drugs.json"
BACKUP = ROOT / "scripts" / "backup" / "egyptian-drugs.original.json"
PROGRESS = ROOT / "scripts" / "backup" / "image-progress.json"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


# ───────────────────────────── file helpers ─────────────────────────────

def load(path: Path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save(rows: list[dict]) -> None:
    """Atomic write, one compact record per line (smaller download, readable diffs)."""
    tmp = DATA.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("[\n")
        fh.write(",\n".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) for row in rows))
        fh.write("\n]\n")
    os.replace(tmp, DATA)


def ensure_backup() -> None:
    if not BACKUP.exists():
        BACKUP.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(DATA, BACKUP)
        print(f"Backup of the original saved to {BACKUP.relative_to(ROOT)}")


REJECTED = re.compile(r"\(\s*(CANCELLED|WITHDRAWAL|WITHDRAWN|ILLEGAL IMPORT)\s*\)|^9{5,}", re.I)


# ───────────────────────────── 1) Arabic names ─────────────────────────────

# Well-known Egyptian pharmacy brands: English brand -> the Arabic spelling people actually use.
# The same list (in this order) decides which products get images first.
BRANDS: dict[str, str] = {
    "PANADOL": "بانادول", "ABIMOL": "أبيمول", "CETAL": "سيتال", "PARAMOL": "بارامول", "ADOL": "أدول",
    "1 2 3": "⁦1 2 3⁩",  # isolated left-to-right, otherwise RTL text shows it as "3 2 1"
     "CONGESTAL": "كونجستال", "COMTREX": "كومتركس", "FLUREST": "فلورست",
    "CATAFLAM": "كتافلام", "VOLTAREN": "فولتارين", "BRUFEN": "بروفين", "KETOFAN": "كيتوفان",
    "KETOLAC": "كيتولاك", "DECLOPHEN": "ديكلوفين", "OLFEN": "أولفين", "RAPIFLAM": "رابيفلام",
    "DOLPHIN": "دولفين", "MARCOFEN": "ماركوفين", "AUGMENTIN": "أوجمنتين", "HIBIOTIC": "هاي بيوتك",
    "CURAM": "كيورام", "MEGAMOX": "ميجاموكس", "AMOXIL": "أموكسيل", "EMOX": "إيموكس",
    "FLUMOX": "فلوموكس", "ZITHROMAX": "زيثروماكس", "XITHRONE": "زيثرون", "ZITHROKAN": "زيثروكان",
    "CIPROFAR": "سيبروفار", "CIPROBAY": "سيبروباي", "TAVANIC": "تافانيك", "SUPRAX": "سوبراكس",
    "XIMACEF": "زيماسيف", "CEFOTAX": "سيفوتاكس", "UNASYN": "يوناسين", "ANTINAL": "أنتينال",
    "STREPTOQUIN": "ستربتوكين", "FLAGYL": "فلاجيل", "AMRIZOLE": "أمريزول", "KAPECT": "كابكت",
    "SMECTA": "سمكتا", "IMODIUM": "إيموديوم", "BUSCOPAN": "بوسكوبان", "VISCERALGINE": "فيسرالجين",
    "SPASMO-DIGESTIN": "سبازمو دايجستين", "DIGESTIN": "دايجستين", "MOTILIUM": "موتيليوم",
    "MOTINORM": "موتينورم", "PRIMPERAN": "بريمبران", "CORTIGEN": "كورتيجين", "ZANTAC": "زانتاك",
    "ANTODINE": "أنتودين", "CONTROLOC": "كونترولوك", "NEXIUM": "نيكسيوم", "PANTOLOC": "بانتولوك",
    "OMEZ": "أوميز", "GASTRAZOLE": "جاسترازول", "GAVISCON": "جافيسكون", "MAALOX": "مالوكس",
    "EPICOGEL": "إبيكوجيل", "MUCOGEL": "ميوكوجيل", "EUCARBON": "يوكاربون", "DISFLATYL": "ديسفلاتيل",
    "COLONA": "كولونا", "COLOVERIN": "كولوفيرين", "DUPHALAC": "دوفالاك", "LACTULOSE": "لاكتيولوز",
    "OTRIVIN": "أوتريفين", "AFRIN": "أفرين", "NASONEX": "نازونكس", "TELFAST": "تلفاست",
    "ZYRTEC": "زيرتك", "CLARITINE": "كلاريتين", "CLARINASE": "كلاريناز", "HISTAZINE": "هيستازين",
    "ALLERCET": "أليرسيت", "FENISTIL": "فينيستيل", "AVIL": "أفيل", "BRONCHICUM": "برونشيكم",
    "TUSSKAN": "توسكان", "TOPLEXIL": "توبلكسيل", "OPLEX": "أوبلكس", "BISOLVON": "بيسلفون",
    "MUCOSOL": "ميوكوسول", "VENTOLIN": "فنتولين", "FARCOLIN": "فاركولين", "SYMBICORT": "سيمبيكورت",
    "SERETIDE": "سيريتايد", "SINGULAIR": "سينجيولير", "CONCOR": "كونكور", "ATACAND": "أتاكاند",
    "CAPOTEN": "كابوتين", "NORVASC": "نورفاسك", "EXFORGE": "إكسفورج", "CO-TAREG": "كوتارج",
    "TAREG": "تارج", "LASIX": "لازكس", "ALDACTONE": "ألداكتون", "ASPOCID": "أسبوسيد",
    "JUSPRIN": "جوسبرين", "PLAVIX": "بلافيكس", "LIPITOR": "ليبيتور", "ATOR": "أتور",
    "CRESTOR": "كريستور", "GLUCOPHAGE": "جلوكوفاج", "CIDOPHAGE": "سيدوفاج", "AMARYL": "أماريل",
    "DIAMICRON": "دياميكرون", "JANUVIA": "جانوفيا", "JANUMET": "جانوميت", "GALVUS": "جالفس",
    "MIXTARD": "ميكستارد", "LANTUS": "لانتوس", "ELTROXIN": "إلتروكسين", "EUTHYROX": "يوثيروكس",
    "NEUROTON": "نيوروتون", "MILGA": "ميلجا", "NEUROVIT": "نيوروفيت", "BECOZYME": "بيكوزيم",
    "CENTRUM": "سنتروم", "VITAMAX": "فيتاماكس", "OCTATRON": "أوكتاترون", "FEROGLOBIN": "فيروجلوبين",
    "HAEMOJET": "هيموجيت", "DEVAROL": "ديفارول", "VIDROP": "فيدروب", "OSTEOCARE": "أوستيوكير",
    "CALCIMATE": "كالسيمات", "C-RETARD": "سي ريتارد", "CEVAROL": "سيفارول", "VITACID": "فيتاسيد",
    "LIMITLESS": "ليميتلس", "BEPANTHEN": "بيبانثين", "FUCIDIN": "فيوسيدين", "FUCICORT": "فيوسيكورت",
    "KENACOMB": "كيناكومب", "DERMOVATE": "ديرموفيت", "BETADERM": "بيتاديرم", "BETADINE": "بيتادين",
    "MEBO": "ميبو", "DAKTARIN": "داكتارين", "CANESTEN": "كانيستين", "LAMISIL": "لاميزيل",
    "ELOCON": "إيلوكون", "PANDERM": "بانديرم", "SUDOCREM": "سودوكريم", "STARVILLE": "ستارفيل",
    "EUCERIN": "يوسيرين", "CERAVE": "سيرافي", "BIODERMA": "بيوديرما", "VICHY": "فيشي",
    "CETAPHIL": "سيتافيل", "MUSTELA": "موستيلا", "TOBREX": "توبركس", "TOBRADEX": "توبرادكس",
    "REFRESH": "ريفريش", "SYSTANE": "سيستين", "PRISOLINE": "بريزولين", "STREPSILS": "ستربسلز",
    "TANTUM": "تانتوم", "B.B.C": "بي بي سي", "LISTERINE": "ليسترين", "SENSODYNE": "سنسوداين",
    "REPARIL": "ريباريل", "MOOV": "موف", "ALPHINTERN": "ألفينترن", "AMBEZIM": "أمبيزيم",
    "MAXILASE": "ماكسيليز", "YASMIN": "ياسمين", "DUPHASTON": "دوفاستون", "PRIMOLUT": "بريمولوت",
    "CLOMID": "كلوميد", "MYOLGIN": "ميولجين", "MYOFEN": "مايوفين", "NORGESIC": "نورجيسيك",
    "RELAXON": "ريلاكسون", "MULTI-RELAX": "مالتي ريلاكس", "ARCOXIA": "أركوكسيا",
    "CELEBREX": "سيليبركس", "MOBIC": "موبيك", "FELDENE": "فيلدين", "XEFO": "زيفو",
    "ZYLORIC": "زيلوريك", "COLCHICINE": "كولشيسين", "ROWATINEX": "رواتينكس", "CYSTONE": "سيستون",
    "URIVIN": "يوريفين", "ENTEROGERMINA": "إنتروجرمينا", "PEDIALYTE": "بيديالايت",
    "REHYDRAN": "ريهيدران", "HYDROSAFE": "هيدروسيف", "NAN": "نان", "BEBELAC": "بيبيلاك",
    "APTAMIL": "أبتاميل", "HERO BABY": "هيرو بيبي", "PAMPERS": "بامبرز",
}

# Common English words inside product names -> natural Arabic (instead of raw letter-by-letter output).
WORDS: dict[str, str] = {
    "PLUS": "بلس", "EXTRA": "إكسترا", "FORTE": "فورت", "MAX": "ماكس", "COLD": "كولد", "FLU": "فلو",
    "NIGHT": "نايت", "DAY": "داي", "CARE": "كير", "BABY": "بيبي", "KIDS": "كيدز", "GOLD": "جولد",
    "ULTRA": "ألترا", "ADVANCE": "أدفانس", "ADVANCED": "أدفانسد", "ACTIVE": "أكتيف",
    "VITAMIN": "فيتامين", "VIT": "فيتامين", "OMEGA": "أوميجا", "ZINC": "زنك", "CALCIUM": "كالسيوم",
    "COLLAGEN": "كولاجين", "WHITE": "وايت", "LIGHT": "لايت", "ONE": "وان", "FREE": "فري",
    "CLEAR": "كلير", "PURE": "بيور", "FRESH": "فريش", "SOFT": "سوفت", "NEW": "نيو", "PRO": "برو",
    "MIX": "ميكس", "COMPLEX": "كومبلكس", "ROYAL": "رويال", "DERMA": "ديرما", "SUN": "صن",
    "AQUA": "أكوا", "WITH": "مع", "AND": "و", "&": "و", "HONEY": "عسل", "LEMON": "ليمون",
    "MEN": "للرجال", "WOMEN": "للسيدات", "ACNE": "أكني", "LIFE": "لايف", "HAIR": "هير",
    "SKIN": "سكين", "EYE": "آي", "HEAD": "هيد", "ACUTE": "أكيوت", "JUNIOR": "جونيور",
    "MAGNESIUM": "ماغنسيوم", "IRON": "أيرون", "SUPER": "سوبر", "SUGAR": "شوجر", "DOUBLE": "دبل",
    "NATURAL": "ناتشورال", "BIO": "بيو", "NEO": "نيو", "DUO": "ديو", "COMP": "كومب", "CO": "كو",
}
VITAMIN_LETTERS = {"A": "أ", "B": "ب", "C": "سي", "D": "د", "E": "هـ", "K": "ك", "D3": "د3", "B12": "ب12", "B6": "ب6"}
SOUNDED_FINAL_E = {"ACNE", "ALOE", "CAFE", "NESTLE", "BEBE", "RECIPE", "KARITE"}

UNIT = r"(?:MCG|MG|GM|KG|G|ML|L|MIU|IU|I\.U\.?|MMOL|MEQ)"
MEASURE_TOKEN = re.compile(rf"^\d[\d.,]*(?:/\d[\d.,]*)*\s?{UNIT}(?:/\d*[\d.,]*\s?(?:{UNIT}|DOSE|ACTUATION|DROP|HR|H)?)*\.?$|^\d[\d.,]*%$", re.I)
NUMERIC = re.compile(r"^\d[\d.,/*:xX+-]*$")
UNIT_START = re.compile(rf"^{UNIT}(?:/.*)?\.?$", re.I)
UNITS_AR = [("MCG", "ميكروجرام"), ("MG", "مجم"), ("GM", "جم"), ("KG", "كجم"), ("ML", "مل"), ("MIU", "مليون وحدة"),
            ("I.U.", "وحدة دولية"), ("I.U", "وحدة دولية"), ("IU", "وحدة دولية"), ("MMOL", "ملي مول"), ("MEQ", "ملي مكافئ"),
            ("ACTUATION", "بخة"), ("DOSE", "جرعة"), ("DROP", "نقطة"), ("HR", "ساعة"), ("G", "جم"), ("L", "لتر"), ("H", "ساعة")]

# Dosage-form nouns. The English head noun is normally the LAST form word in the name.
FORMS: list[tuple[str, str]] = [
    ("أقراص", r"(?:FC|SC|EC|SFC|SR|XR|MR|CR|ODT|EFF|CHEW|SCORED)?(?:TAB|TABS|TABLET|TABLETS|TABL)|FCT|CAPLETS?|LOZENGES?|PASTILLES?"),
    ("كبسولات", r"(?:SG|HG|VEG|SOFT|HARD)?(?:CAP|CAPS|CAPSULE|CAPSULES)|SOFTGELS?|SPANSULES?"),
    ("شراب", r"SYRUP|SYR|ELIXIR"),
    ("لبوس", r"SUPP|SUPPS|SUPPOSITORY|SUPPOSITORIES|OVULES?|PESSARY|PESSARIES"),
    ("أمبول", r"AMP|AMPS|AMPOULE|AMPOULES|AMPULE|AMPULES"),
    ("فيال", r"VIAL|VIALS"),
    ("حقنة جاهزة", r"SYRINGE|SYRINGES"),
    ("قلم حقن", r"PEN|PENS|CARTRIDGE|CARTRIDGES|PENFILL|FLEXPEN|SOLOSTAR"),
    ("كريم", r"CREAM|CR|CREME"),
    ("مرهم", r"OINT|OINTMENT"),
    ("جل", r"GEL|JEL|GELLY|EMULGEL"),
    ("لوشن", r"LOTION"),
    ("شامبو", r"SHAMPOO"),
    ("صابون", r"SOAP|BAR"),
    ("بخاخ", r"SPRAY|SPARY"),
    ("بخاخة استنشاق", r"INHALER|INH|TURBUHALER|DISKUS|EVOHALER|BREEZHALER"),
    ("نقط", r"DROPS|DROP|DPS|DRPS"),
    ("محلول", r"SOLUTION|SOLN|SOL"),
    ("بودرة", r"POWDER|PWD|PD"),
    ("أكياس", r"SACHET|SACHETS|SACH"),
    ("سيرم", r"SERUM"),
    ("ماسك", r"MASK"),
    ("زيت", r"OIL"),
    ("غسول", r"CLEANSER|WASH|DOUCHE"),
    ("غسول للفم", r"MOUTHWASH"),
    ("تونر", r"TONER"),
    ("بلسم", r"CONDITIONER"),
    ("مزيل عرق", r"DEODORANT|DEO|ROLL-ON"),
    ("معجون أسنان", r"TOOTHPASTE"),
    ("لصقة", r"PATCH|PATCHES|PLASTER"),
    ("حليب", r"MILK"),
    ("جيلي للمضغ", r"GUMMIES|GUMMY"),
    ("حبيبات", r"GRANULES|GRAN"),
    ("فوم", r"FOAM|MOUSSE"),
    ("شاي أعشاب", r"TEA"),
    ("واقي شمس", r"SUNSCREEN|SUNBLOCK"),
    ("كريم محيط العين", r"CONTOUR"),
    ("قطع", r"PIECES|PCS"),
]
FORM_RX = [(noun, re.compile(rf"^(?:{rx})$")) for noun, rx in FORMS]
WEAK_FORM_RX = [("شراب", re.compile(r"^(?:SUSP|SUSPENSION)$")), ("محلول وريدي", re.compile(r"^(?:INF|INFUSION)$"))]
EFF_RX = re.compile(r"^(?:EFF|EFFERVESCENT)")

# Qualifiers: where it is used / who it is for / what it does.
QUALIFIERS: dict[str, str] = {
    "MASSAGE": "مساج", "TOPICAL": "موضعي", "TOP": "موضعي", "VAGINAL": "مهبلي", "VAG": "مهبلي",
    "RECTAL": "شرجي", "MOISTURIZING": "مرطب", "MOISTURISING": "مرطب", "MOISTURIZER": "مرطب",
    "ANTISEPTIC": "مطهر", "SUNSCREEN": "واقي شمس", "SPF": "واقي شمس", "SUN": "واقي شمس",
    "EYE/EAR": "للعين والأذن", "EYE/NOSE": "للعين والأنف", "EYE": "للعين", "EAR": "للأذن",
    "NASAL": "للأنف", "NOSE": "للأنف", "MOUTH": "للفم", "HAIR": "للشعر", "SCALP": "لفروة الرأس",
    "SKIN": "للبشرة", "FACE": "للوجه", "FACIAL": "للوجه", "BODY": "للجسم", "HAND": "لليدين",
    "FOOT": "للقدمين", "FEET": "للقدمين", "LIP": "للشفاه", "LIPS": "للشفاه",
    "WHITENING": "للتفتيح", "LIGHTENING": "للتفتيح", "ANTI-DANDRUFF": "ضد القشرة",
    "INTIMATE": "للمنطقة الحساسة", "FEMININE": "للمنطقة الحساسة", "SCAR": "للندبات",
    "CHEW": "للمضغ", "CHEWABLE": "للمضغ", "SUBLINGUAL": "تحت اللسان",
    "BABY": "للأطفال", "INFANT": "للأطفال", "INFANTS": "للأطفال", "KIDS": "للأطفال",
    "CHILDREN": "للأطفال", "CHILD": "للأطفال", "PAED": "للأطفال", "PED": "للأطفال",
    "PEDIATRIC": "للأطفال", "PAEDIATRIC": "للأطفال", "ADULT": "للكبار", "ADULTS": "للكبار",
    "MEN": "للرجال", "WOMEN": "للسيدات", "ORAL": "ORAL",
    "NEBULIZER": "للاستنشاق", "RESPIRATOR": "للاستنشاق", "INHALATION": "للاستنشاق",
}
QUALIFIER_ORDER = ["مساج", "واقي شمس", "موضعي", "مهبلي", "شرجي", "مرطب", "مطهر", "تحت اللسان", "للمضغ", "بالفم", "للاستنشاق",
                   "ضد القشرة", "للتفتيح", "للندبات", "للعين والأذن", "للعين والأنف", "للعين", "للأذن", "للأنف",
                   "للفم", "للشعر", "لفروة الرأس", "للوجه", "للبشرة", "للجسم", "لليدين", "للقدمين", "للشفاه",
                   "للمنطقة الحساسة", "للأطفال", "للكبار", "للرجال", "للسيدات"]
# Other words that mark the end of the brand part of the name.
STOP_WORDS = {"FILM", "COATED", "SUGAR", "ENTERIC", "PROLONGED", "EXTENDED", "SUSTAINED", "MODIFIED", "RELEASE",
              "REL", "EXT", "PREFILLED", "PRE-FILLED", "PREF", "I.V", "I.M", "S.C", "IV", "IM", "SC", "F.C", "S.C.T",
              "E.C", "S.R", "X.R", "FOR", "VEG", "SOFT", "HARD", "GELATIN", "LYOPH", "CONC", "CONCENTRATE", "SCORED",
              "ORODISPERSIBLE", "DISPERSIBLE", "INSTANT", "SUSP", "SUSPENSION", "INF", "INFUSION", "INJ", "INJECTION"}

HAS_ARABIC = re.compile(r"[ء-ي]")
DOUBLED = re.compile(r"([بتثجحخدذرزسشصضطظفقكلمنه])\1")


def clean_token(token: str) -> str:
    return token.upper().strip(".,;:()[]")


GLUED_SOLID = re.compile(r"^\d*[A-Z]{0,3}?(TABS?|TABLETS?|CAPS?|CAPSULES?)$")


def form_of(token: str) -> str | None:
    plain = clean_token(token).replace(".", "")
    glued = GLUED_SOLID.match(plain)
    if glued:  # "20CAPS", "S.R.CAPS.", "C.TABS.", "F.C.TABS."
        return "أقراص" if glued.group(1).startswith("TAB") else "كبسولات"
    if plain == "ODT":
        return "أقراص"
    for noun, rx in FORM_RX:
        if rx.match(plain):
            return noun
    return None


def measure_at(tokens: list[str], i: int) -> tuple[str, int] | None:
    """Strength / size expression starting at tokens[i] -> (raw text, tokens consumed)."""
    token = tokens[i]
    if MEASURE_TOKEN.match(token):
        return token, 1
    if NUMERIC.match(token) and i + 1 < len(tokens) and UNIT_START.match(tokens[i + 1]):
        used = 2
        text = f"{token} {tokens[i + 1]}"
        # "156 MG/5 ML" -> the trailing unit is its own token
        if tokens[i + 1].rstrip(".")[-1:].isdigit() and i + 2 < len(tokens) and UNIT_START.match(tokens[i + 2]):
            text += f" {tokens[i + 2]}"
            used = 3
        return text, used
    return None


def measure_ar(text: str) -> str:
    out = text.upper().rstrip(".")
    out = re.sub(r"(\d)([A-Z])", r"\1 \2", out)
    for unit, arabic in UNITS_AR:
        out = re.sub(rf"(?<![A-Z.]){re.escape(unit)}(?![A-Z])", arabic, out)
    return re.sub(r"\s+", " ", out).strip()


def fix_translit(arabic: str, english: str) -> str:
    """Tidy one machine-transliterated brand token."""
    word = arabic.strip("/.,-&")
    upper = clean_token(english)
    if (re.fullmatch(r"[A-Z'-]{5,}", upper) and upper.endswith("E") and upper[-2] not in "AEIOUY"
            and upper not in SOUNDED_FINAL_E and word.endswith("ي") and len(word) > 3):
        word = word[:-1]  # silent final "e": جلوكوفاجي -> جلوكوفاج
    word = DOUBLED.sub(r"\1", word)  # كوللاجين -> كولاجين
    word = re.sub(r"^وه", "و", word)  # WH- : وهيت -> ويت
    return word


def is_stop(tokens: list[str], i: int) -> bool:
    token = tokens[i]
    upper = clean_token(token)
    if measure_at(tokens, i):
        return True
    if NUMERIC.match(token):
        if i == len(tokens) - 1:
            return True
        nxt = clean_token(tokens[i + 1])
        return bool(form_of(tokens[i + 1]) or nxt in QUALIFIERS or nxt in STOP_WORDS or nxt in {"X", "*"}
                    or EFF_RX.match(nxt))
    if i == 0:
        return False
    return bool(form_of(token) or upper in QUALIFIERS or upper in STOP_WORDS
                or any(rx.match(upper.replace(".", "")) for _, rx in WEAK_FORM_RX) or EFF_RX.match(upper))


def arabic_name(row: dict, original_ar: str) -> tuple[str, bool]:
    """Returns (new Arabic name, aligned?)."""
    english = re.sub(r"\([^)]*\)?", " ", row["commercial_name_en"])
    tokens = english.split()
    old = original_ar.split()
    if not tokens:
        return original_ar, False

    upper_name = " ".join(tokens).upper()

    # 1) Where does the brand end?
    end = len(tokens)
    for i in range(len(tokens)):
        if is_stop(tokens, i):
            end = i
            break
    end = max(end, 1)

    # 2) Brand in Arabic.
    brand: list[str] = []
    start = 0
    for key, arabic in BRANDS.items():
        if upper_name == key or upper_name.startswith(key + " "):
            brand.append(arabic)
            start = len(key.split())
            break
    aligned = len(old) >= end
    for j in range(start, end):
        upper = clean_token(tokens[j])
        previous = clean_token(tokens[j - 1]) if j else ""
        if previous in {"VITAMIN", "VIT"} and upper in VITAMIN_LETTERS:
            brand.append(VITAMIN_LETTERS[upper])
        elif upper in WORDS:
            brand.append(WORDS[upper])
        elif NUMERIC.match(tokens[j]) or not re.search(r"[A-Za-z]", tokens[j]):
            brand.append(tokens[j])
        elif j < len(old) and HAS_ARABIC.search(old[j]):
            brand.append(fix_translit(old[j], tokens[j]))
        else:
            aligned = False
    if not brand:  # nothing usable — keep whatever Arabic words the original had
        brand = [DOUBLED.sub(r"\1", w) for w in old if HAS_ARABIC.search(w)][:3]
        aligned = False

    # 3) Strength (first measure expression after the brand).
    strength = ""
    strength_at = -1
    for i in range(end, len(tokens)):
        found = measure_at(tokens, i)
        if found:
            strength, strength_at = measure_ar(found[0]), i
            break

    # 4) Dosage form + qualifiers from the rest of the name.
    noun = None
    weak = None
    effervescent = False
    qualifiers: list[str] = []
    noun_at = -1
    for position, token in enumerate(tokens[end:], start=end):
        upper = clean_token(token)
        plain = upper.replace(".", "")
        if EFF_RX.match(plain):
            effervescent = True
        found = form_of(token)
        if found:
            noun, noun_at = found, position
        for weak_noun, rx in WEAK_FORM_RX:
            if rx.match(plain) and weak is None:
                weak = weak_noun
        qualifier = QUALIFIERS.get(upper) or QUALIFIERS.get(plain)
        if qualifier and qualifier not in qualifiers:
            qualifiers.append(qualifier)
    # Qualifier words that sit inside the brand ("BABY", "HAIR"…) still describe the product.
    if noun is None:
        noun = weak
    if noun is None and effervescent:
        noun, effervescent = "فوار", False

    if "ORAL" in qualifiers:
        qualifiers.remove("ORAL")
        if noun in {"نقط", "محلول", "بودرة"}:
            qualifiers.append("بالفم")
        elif noun in {"بخاخ", "جل"}:
            qualifiers.append("للفم")
    if noun == "نقط" and "للعين" in qualifiers:
        noun = "قطرة"
    if noun == "لبوس" and "شرجي" in qualifiers:
        qualifiers.remove("شرجي")
    if noun == "واقي شمس" and "واقي شمس" in qualifiers:
        qualifiers.remove("واقي شمس")
    if noun == "غسول للفم" and "للفم" in qualifiers:
        qualifiers.remove("للفم")
    if noun == "كريم محيط العين" and "للعين" in qualifiers:
        qualifiers.remove("للعين")
    if noun in {"أقراص", "كبسولات", "أكياس"} and "مهبلي" in qualifiers:
        qualifiers[qualifiers.index("مهبلي")] = "مهبلية"
    qualifiers.sort(key=lambda q: QUALIFIER_ORDER.index(q) if q in QUALIFIER_ORDER else 5)

    # "كتافلام 50 مجم أقراص" (strength before the form) but "كريم ... 50 جم" (pack size after it).
    pack_size = bool(strength) and noun_at != -1 and strength_at > noun_at
    parts = brand + ([strength] if strength and not pack_size else []) + ([noun] if noun else [])
    if effervescent:
        parts.append("فوار")
    parts += qualifiers
    if pack_size:
        parts.append(strength)
    name = re.sub(r"\s+", " ", " ".join(p for p in parts if p)).strip(" -/.,&")
    if not HAS_ARABIC.search(name):
        return original_ar, False
    return name, aligned


def run_names(dry_run: int) -> None:
    ensure_backup()
    rows = load(DATA)
    original = load(BACKUP)
    if len(rows) != len(original):
        sys.exit("Row count differs from the backup — restore scripts/backup/ or delete it to start fresh.")

    changed = aligned_count = 0
    samples = []
    for row, source in zip(rows, original):
        before = source["commercial_name_ar"]
        after, aligned = arabic_name(row, before)
        aligned_count += aligned
        if after != before:
            changed += 1
        samples.append((row["commercial_name_en"], before, after))
        if not dry_run:
            row["commercial_name_ar"] = after

    print(f"Rows: {len(rows):,} | Arabic names rewritten: {changed:,} | cleanly aligned brand: {aligned_count:,}")
    if dry_run:
        random.seed(7)
        for english, before, after in random.sample(samples, min(dry_run, len(samples))):
            print(f"  {english}\n      قبل: {before}\n      بعد: {after}")
        print("Dry run — nothing written.")
        return
    save(rows)
    print(f"Saved {DATA.relative_to(ROOT)}")


# ───────────────────────────── 2) Product images ─────────────────────────────

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
}
BLOCKED_HOSTS = ("pinterest", "pinimg", "facebook", "fbsbx", "fbcdn", "instagram", "tiktok", "ytimg", "youtube",
                 "shutterstock", "alamy", "istockphoto", "gettyimages", "dreamstime", "depositphotos", "123rf",
                 "wikimedia", "twimg", "lookaside")
SEARCH_TIMEOUT = 15
IMAGE_TIMEOUT = 10


class RateLimiter:
    """At most one search request every `interval` seconds, shared by all worker threads."""

    def __init__(self, interval: float):
        self.interval = interval
        self.lock = threading.Lock()
        self.next_at = 0.0

    def wait(self) -> None:
        with self.lock:
            now = time.monotonic()
            delay = max(0.0, self.next_at - now)
            # A little jitter so the requests do not arrive on an exact beat.
            self.next_at = max(now, self.next_at) + self.interval + random.uniform(0, self.interval * 0.2)
        if delay:
            time.sleep(delay)

    def pause(self, seconds: float) -> None:
        """Hold every worker back for `seconds` (used when the search provider stops answering)."""
        with self.lock:
            self.next_at = max(self.next_at, time.monotonic() + seconds)


class ImageFinder:
    def __init__(self, interval: float):
        import requests  # imported here so the `names` step needs no third-party packages

        self.requests = requests
        self.local = threading.local()
        self.limiter = RateLimiter(interval)
        self.ddg_ok = True

    @property
    def session(self):
        if not hasattr(self.local, "session"):
            self.local.session = self.requests.Session()
            self.local.session.headers.update(HEADERS)
        return self.local.session

    def get(self, url: str, **kwargs):
        """GET with retry + exponential backoff on throttling / transient errors."""
        for attempt in range(3):
            try:
                response = self.session.get(url, **kwargs)
                if response.status_code in (429, 500, 502, 503, 504):
                    time.sleep(2 ** attempt + random.random())
                    continue
                return response
            except self.requests.RequestException:
                time.sleep(1 + attempt)
        return None

    # -- search engines: each returns [(image_url, title, page_url)] --

    def search_ddg(self, query: str) -> list[tuple[str, str, str]]:
        if not self.ddg_ok:
            return []
        self.limiter.wait()
        page = self.get("https://duckduckgo.com/", params={"q": query, "iax": "images", "ia": "images"}, timeout=SEARCH_TIMEOUT)
        token = re.search(r"vqd=[\"']?([\d-]+)", page.text) if page is not None and page.ok else None
        if not token:
            self.ddg_ok = False
            return []
        result = self.get("https://duckduckgo.com/i.js", timeout=SEARCH_TIMEOUT, headers={"Referer": "https://duckduckgo.com/"},
                          params={"l": "wt-wt", "o": "json", "q": query, "vqd": token.group(1), "f": ",,,", "p": "1"})
        if result is None or not result.ok:
            if self.ddg_ok:  # DuckDuckGo is refusing automated image queries — stop asking, use the fallback
                self.ddg_ok = False
                print("  (DuckDuckGo image search refused the request; using Bing for the rest of this run)")
            return []
        try:
            return [(r.get("image", ""), r.get("title", ""), r.get("url", "")) for r in result.json().get("results", [])]
        except ValueError:
            return []

    def search_bing(self, query: str) -> list[tuple[str, str, str]]:
        self.limiter.wait()
        page = self.get("https://www.bing.com/images/search", params={"q": query, "form": "HDRSC2", "first": "1"}, timeout=SEARCH_TIMEOUT)
        if page is None or not page.ok:
            return []
        found = []
        for blob in re.findall(r'\sm="(\{.*?\})"', page.text):
            try:
                meta = json.loads(html.unescape(blob))
            except ValueError:
                continue
            found.append((meta.get("murl", ""), meta.get("t", ""), meta.get("purl", "")))
        return found

    # -- validation --

    def is_valid_image(self, url: str) -> bool:
        if not url.startswith("https://") or any(host in url.lower() for host in BLOCKED_HOSTS):
            return False
        if re.search(r"\.(svg|gif)(\?|$)", url, re.I):
            return False
        try:
            with self.session.get(url, timeout=IMAGE_TIMEOUT, stream=True, headers={"Referer": ""}) as response:
                if response.status_code != 200:
                    return False
                if not re.match(r"image/(jpeg|jpg|png|webp)", response.headers.get("Content-Type", ""), re.I):
                    return False
                length = response.headers.get("Content-Length")
                if length and length.isdigit():
                    return 4_000 <= int(length) <= 6_000_000
                return len(next(response.iter_content(8192), b"")) >= 4_000
        except self.requests.RequestException:
            return False

    def find(self, name_en: str, needle: str) -> tuple[str | None, bool]:
        """Returns (image url or None, did any search result mention this product?).

        A provider that is blocking us answers with an error, an empty page or unrelated
        decoy pictures — in all three cases nothing mentions the product, so the second
        value is what the caller uses to notice it is being throttled.
        """
        clean = re.sub(r"\([^)]*\)?", " ", name_en)
        clean = re.sub(r"\s+", " ", clean).strip()
        query = f"{clean} Egypt pharmacy"
        relevant = False
        for search in (self.search_ddg, self.search_bing):
            checked = 0
            for url, title, page in search(query):
                # The result must actually mention the brand — a wrong photo is worse than no photo.
                haystack = re.sub(r"[^a-z0-9]", "", f"{title} {url} {page}".lower())
                if needle not in haystack:
                    continue
                relevant = True
                checked += 1
                if self.is_valid_image(url):
                    return url, True
                if checked >= 6:
                    break
        return None, relevant


def has_image(row: dict) -> bool:
    """Same rule the website uses: only an https:// URL counts as a product photo."""
    url = row.get("image_url")
    return isinstance(url, str) and url.startswith("https://")


def is_listed(row: dict) -> bool:
    """Rows the storefront actually shows (see isUsable in src/data/catalog.ts)."""
    name = row.get("commercial_name_en")
    price = row.get("price_egp")
    return (isinstance(name, str) and len(name.strip()) > 1 and isinstance(price, (int, float)) and price > 0
            and not REJECTED.search(name) and "(N/A" not in name.upper())


def needle_of(name_en: str, brand: str | None = None) -> str | None:
    """Lower-case letters/digits a search result must contain to be accepted for this product."""
    if brand:
        if brand[0].isdigit():  # "1 2 3"
            return re.sub(r"\s", "", brand)
        return re.sub(r"[^a-z0-9]", "", brand.lower().split()[0])
    tokens = re.sub(r"\([^)]*\)?", " ", name_en).split()
    end = len(tokens)
    for i in range(len(tokens)):
        if is_stop(tokens, i):
            end = i
            break
    words = [re.sub(r"[^a-z0-9]", "", token.lower()) for token in tokens[:max(end, 1)]]
    words = [word for word in words if word]
    if not words:
        return None
    needle = words[0]
    generic = needle.upper() in WORDS or needle.upper() in QUALIFIERS
    if (len(needle) < 5 or generic) and len(words) > 1:  # "C VIT", "BABY REST" — one short/common word matches almost anything
        needle += words[1]
    return needle if len(needle) >= 3 and re.search(r"[a-z]", needle) else None


def pick_targets(rows: list[dict], limit: int, attempted: set[str]) -> list[tuple[int, str]]:
    """Every listed product without an image -> [(row index, needle)].

    Well-known brands go first (first pack of each brand, then a second and a third),
    followed by the rest of the database in file order. `limit` 0 means no limit.
    """
    per_brand: dict[str, list[int]] = {brand: [] for brand in BRANDS}
    brand_of: dict[int, str] = {}
    for index, row in enumerate(rows):
        if not is_listed(row):
            continue
        name = row["commercial_name_en"].upper()
        for brand in BRANDS:
            if name == brand or name.startswith(brand + " "):
                per_brand[brand].append(index)
                brand_of[index] = brand
                break
    # Oral solids and liquids first — they are what people ask for by name.
    rank = {"ORAL.SOLID": 0, "ORAL.LIQUID": 1, "TOPICAL": 2, "SPRAY": 3, "EYE": 3, "EFF": 4}
    order: list[int] = []
    for round_number in range(3):
        for brand, indexes in per_brand.items():
            ordered = sorted(indexes, key=lambda i: rank.get(rows[i].get("route"), 6))
            if round_number < len(ordered):
                order.append(ordered[round_number])
    queued = set(order)
    order += [index for index, row in enumerate(rows) if index not in queued and is_listed(row)]

    pending: list[tuple[int, str]] = []
    for index in order:
        row = rows[index]
        if has_image(row) or row["commercial_name_en"] in attempted:
            continue  # already done (or already tried without success) — no duplicate work
        needle = needle_of(row["commercial_name_en"], brand_of.get(index))
        if needle:
            pending.append((index, needle))
    return pending[:limit] if limit else pending


SAVE_EVERY_FOUND = 50     # write the JSON after this many new images…
SAVE_EVERY_DONE = 400     # …or after this many lookups, whichever comes first
BLOCK_STREAK = 30         # consecutive lookups where no result even mentions the product = we are being throttled
BLOCK_PAUSES = (300, 900, 1800)  # seconds to back off; after the last one the run stops


def run_images(limit: int, workers: int, interval: float, retry_failed: bool) -> None:
    try:
        import requests  # noqa: F401
    except ImportError:
        sys.exit("This step needs the `requests` package:  pip install requests")

    ensure_backup()
    rows = load(DATA)
    attempted: set[str] = set()
    if PROGRESS.exists() and not retry_failed:
        attempted = set(load(PROGRESS))

    targets = pick_targets(rows, limit, attempted)
    have = sum(1 for row in rows if has_image(row))
    hours = len(targets) * interval * 1.5 / 3600
    print(f"Images already saved: {have:,} | to fetch now: {len(targets):,} "
          f"(workers={workers}, {interval}s between searches, roughly {hours:.1f} h)", flush=True)
    if not targets:
        return

    finder = ImageFinder(interval)
    done = found = unsaved_found = unsaved_done = 0
    pauses = 0
    silent: list[str] = []  # current run of products whose search returned nothing relevant
    started = time.monotonic()

    def checkpoint() -> None:
        save(rows)
        PROGRESS.parent.mkdir(parents=True, exist_ok=True)
        tmp = PROGRESS.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(sorted(attempted), fh, ensure_ascii=False)
        os.replace(tmp, PROGRESS)

    def work(index: int, needle: str) -> tuple[int, str | None, bool]:
        try:
            url, relevant = finder.find(rows[index]["commercial_name_en"], needle)
            return index, url, relevant
        except Exception as error:  # one bad lookup must never stop the batch
            print(f"  ! {rows[index]['commercial_name_en']}: {error!r}", flush=True)
            return index, None, False

    stopped_early = ""
    pool = ThreadPoolExecutor(max_workers=workers)
    queue = iter(targets)
    running: set = set()
    try:
        while True:
            # Keep only a small window of lookups in flight so the run can stop promptly.
            while len(running) < workers * 2:
                target = next(queue, None)
                if target is None:
                    break
                running.add(pool.submit(work, *target))
            if not running:
                break
            future = next(as_completed(running))
            running.discard(future)
            index, url, relevant = future.result()
            name = rows[index]["commercial_name_en"]
            done += 1
            unsaved_done += 1
            if url:
                rows[index]["image_url"] = url
                found += 1
                unsaved_found += 1
            attempted.add(name)  # "no result" is remembered so the next run does not ask again
            if relevant:
                silent.clear()
            else:
                silent.append(name)
            print(f"  [{done:,}/{len(targets):,}] {'OK  ' if url else 'none' if relevant else '--  '} {name[:60]}", flush=True)

            if unsaved_found >= SAVE_EVERY_FOUND or unsaved_done >= SAVE_EVERY_DONE:
                checkpoint()  # incremental save — nothing is lost if interrupted
                unsaved_found = unsaved_done = 0
                rate = (time.monotonic() - started) / done
                print(f"  … saved. {found:,} new images so far; about {(len(targets) - done) * rate / 3600:.1f} h left", flush=True)

            if len(silent) >= BLOCK_STREAK:
                # Those products were never really searched — forget them so a later run tries again.
                attempted.difference_update(silent)
                silent.clear()
                if pauses >= len(BLOCK_PAUSES):
                    stopped_early = "The image search provider keeps refusing requests — stopping. Re-run later to continue."
                    break
                wait = BLOCK_PAUSES[pauses]
                pauses += 1
                finder.ddg_ok = True
                print(f"  (nothing relevant came back {BLOCK_STREAK} times in a row — probably rate-limited; pausing {wait // 60} min)", flush=True)
                finder.limiter.pause(wait)
    except KeyboardInterrupt:
        stopped_early = "Interrupted — progress saved."
    finally:
        pool.shutdown(wait=False, cancel_futures=True)
        attempted.difference_update(silent)  # an unfinished run of blanks is not evidence either
        checkpoint()
    if stopped_early:
        print(f"\n{stopped_early}", flush=True)
    print(f"Done. New images: {found:,}/{done:,}. Total with image_url: {sum(1 for row in rows if has_image(row)):,}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich the Egyptian drugs database (Arabic names + product images).")
    parser.add_argument("step", choices=["names", "images", "all"])
    parser.add_argument("--dry-run", type=int, default=0, metavar="N", help="names: preview N random before/after rows, write nothing")
    parser.add_argument("--limit", type=int, default=0, help="images: maximum products to look up in this run (0 = the whole database)")
    parser.add_argument("--workers", type=int, default=3, help="images: concurrent lookups")
    parser.add_argument("--interval", type=float, default=1.5, help="images: minimum seconds between search requests")
    parser.add_argument("--retry-failed", action="store_true", help="images: look again for products that had no result before")
    args = parser.parse_args()

    if not DATA.exists():
        sys.exit(f"Not found: {DATA}")
    if args.step in ("names", "all"):
        run_names(args.dry_run)
    if args.step in ("images", "all") and not args.dry_run:
        run_images(args.limit, args.workers, args.interval, args.retry_failed)


if __name__ == "__main__":
    main()
