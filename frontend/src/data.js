import dataset from "./data/cards.json";
import pantomime from "./data/pantomime.json";
import { pantomimeCards, pantomimeCategories as buildCategories } from "./rules/pantomime.js";

// Pantomime cards share the card list (so history and lookups work) but have
// their own categories, which only the pantomime game mode offers.
export const { categories } = dataset;
export const pantomimeCategories = buildCategories(pantomime);
export const cards = [...dataset.cards, ...pantomimeCards(pantomime)];
export const tabooCardCount = dataset.cards.length;
