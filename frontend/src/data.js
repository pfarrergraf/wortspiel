import dataset from "./data/cards.json";
import pantomime from "./data/pantomime.json";
import { pantomimeCards } from "./rules/pantomime.js";

// Pantomime cards share the card list (so history and lookups work) but have
// no entry in `categories`; only the pantomime game mode selects them.
export const { categories } = dataset;
export const cards = [...dataset.cards, ...pantomimeCards(pantomime)];
export const tabooCardCount = dataset.cards.length;
