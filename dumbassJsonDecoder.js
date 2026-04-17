function isEncompassedBy(str, startItem, endItem) {
    const trimmed = str.trim();
    return trimmed[0] === startItem && trimmed[trimmed.length - 1] === endItem;
}

// Splits by delimiter but ignores delimiters inside {}, [], or quotes
function topLevelSplit(str, delimiter) {
    const result = [];
    let current = "";
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (escape) {
            current += char;
            escape = false;
            continue;
        }

        if (char === "\\") {
            current += char;
            escape = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            current += char;
            continue;
        }

        if (!inString) {
            if (char === "{" || char === "[") depth++;
            if (char === "}" || char === "]") depth--;

            if (char === delimiter && depth === 0) {
                result.push(current);
                current = "";
                continue;
            }
        }

        current += char;
    }

    if (current.length) result.push(current);
    return result;
}

function decodeObject(objectString) {
    if (!isEncompassedBy(objectString, "{", "}")) {
        throw new Error("Invalid object string");
    }

    const inner = objectString.slice(1, -1).trim();
    if (!inner) return {};

    const lines = topLevelSplit(inner, ",");

    const obj = {};

    for (let line of lines) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;

        const key = line.slice(0, idx).trim().replace(/^"|"$/g, "");
        const value = line.slice(idx + 1).trim();

        if (isEncompassedBy(value, "{", "}")) {
            obj[key] = decodeObject(value);
        } else if (isEncompassedBy(value, "[", "]")) {
            obj[key] = decodeArray(value);
        } else {
            obj[key] = decodePrimitive(value);
        }
    }

    return obj;
}

function decodeArray(arrayString) {
    if (!isEncompassedBy(arrayString, "[", "]")) {
        throw new Error("Invalid array string");
    }

    const inner = arrayString.slice(1, -1).trim();
    if (!inner) return [];

    const items = topLevelSplit(inner, ",");
    const arr = [];

    for (let item of items) {
        item = item.trim();
        if (!item) continue;

        if (isEncompassedBy(item, "{", "}")) {
            arr.push(decodeObject(item));
        } else if (isEncompassedBy(item, "[", "]")) {
            arr.push(decodeArray(item));
        } else {
            arr.push(decodePrimitive(item));
        }
    }

    return arr;
}

function decodePrimitive(valueString) {
    const v = valueString.trim();

    if (v.startsWith('"') && v.endsWith('"')) {
        return v.slice(1, -1);
    }

    if (v === "true") return true;
    if (v === "false") return false;
    if (v === "null") return null;

    // numbers (including - and +)
    if (!isNaN(Number(v))) {
        return Number(v);
    }

    throw new Error("Invalid primitive value: " + valueString);
}

function sanitizeAiJson(input) {
    return input
        // remove // comments
        .replace(/\/\/.*$/gm, "")
        // remove trailing commas before } or ]
        .replace(/,\s*([}\]])/g, "$1")
        // trim whitespace
        .trim();
}

export function dumbassDecodeJson(jsonString) {
    try {
        const cleaned = sanitizeAiJson(jsonString);
        return decodeObject(cleaned);
    } catch (error) {
        throw new Error("Failed to decode JSON string: " + error.message);
    }
}