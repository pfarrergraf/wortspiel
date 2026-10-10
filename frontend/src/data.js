import dataset from "./data/cards.json";
import pantomime from "./data/pantomime.json";
import noises from "../data/noises-de.json";
import { noiseCards, noiseCategories as buildNoiseCategories } from "./rules/noises.js";
import { withMixedModes } from "./rules/play-modes.js";
import { pantomimeCards, pantomimeCategories as buildCategories } from "./rules/pantomime.js";

// Pantomime cards share the card list (so history and lookups work) but have
// their own categories, which only the pantomime game mode offers.
export const { categories } = dataset;
export const pantomimeCategories = buildCategories(pantomime);
export const noisesCategories = buildNoiseCategories(noises);
export const pantomimeCardCount = pantomimeCards(pantomime).length;
export const noisesCardCount = noises.cards.length;
export const cards = withMixedModes([...dataset.cards, ...pantomimeCards(pantomime), ...noiseCards(noises)]);
export const tabooCardCount = dataset.cards.length;
