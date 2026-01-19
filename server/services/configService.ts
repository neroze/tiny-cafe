import { storage } from "../storage";

export async function getMergedLabels() {
  const configuredLabels = await storage.getSetting("configured_labels");
  const labels = configuredLabels ? JSON.parse(configuredLabels) : [];
  const uniqueLabels = await storage.getUniqueLabels();
  return Array.from(new Set([...(labels as string[]), ...uniqueLabels]));
}

export async function getConfiguredLabels() {
  const labelsStr = await storage.getSetting("configured_labels");
  return labelsStr ? JSON.parse(labelsStr) : [];
}

export async function addLabel(label: string) {
  if (!label) throw new Error("Label required");
  const labelsStr = await storage.getSetting("configured_labels");
  let labels = labelsStr ? JSON.parse(labelsStr) : [];
  if (!labels.includes(label)) {
    labels.push(label);
    await storage.setSetting("configured_labels", JSON.stringify(labels));
  }
  return labels;
}

export async function removeLabel(label: string) {
  const labelsStr = await storage.getSetting("configured_labels");
  let labels = labelsStr ? JSON.parse(labelsStr) : [];
  labels = labels.filter((l: string) => l !== label);
  await storage.setSetting("configured_labels", JSON.stringify(labels));
  return labels;
}

export async function getConfiguredCategories() {
  const catsStr = await storage.getSetting("configured_categories");
  return catsStr ? JSON.parse(catsStr) : ["Snacks", "Drinks", "Main"];
}

export async function addCategory(category: string) {
  if (!category) throw new Error("Category required");
  const catsStr = await storage.getSetting("configured_categories");
  let cats = catsStr ? JSON.parse(catsStr) : ["Snacks", "Drinks", "Main"];
  if (!cats.includes(category)) {
    cats.push(category);
    await storage.setSetting("configured_categories", JSON.stringify(cats));
  }
  return cats;
}

export async function removeCategory(category: string) {
  const catsStr = await storage.getSetting("configured_categories");
  let cats = catsStr ? JSON.parse(catsStr) : ["Snacks", "Drinks", "Main"];
  cats = cats.filter((c: string) => c !== category);
  await storage.setSetting("configured_categories", JSON.stringify(cats));
  return cats;
}

