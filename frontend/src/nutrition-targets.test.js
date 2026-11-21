import { expect, it } from 'vitest';
import { canAddNutritionProfile, exceedsNutritionTarget } from './nutrition-targets';

const goals = {nang_luong:2000,chat_dam:100,chat_bot_duong:250,chat_beo:70,natri:2000};
const totals = {nang_luong:1200,chat_dam:60,chat_bot_duong:100,chat_beo:40,natri:1800};
const profile = {nang_luong:200,chat_dam:20,chat_bot_duong:30,chat_beo:5,natri:100,chat_xo:10};

it('rejects a protein-rich soup that would exceed sodium',()=>{
  expect(canAddNutritionProfile(totals,goals,{...profile,natri:2184.32})).toBe(false);
});

it.each(['nang_luong','chat_dam','chat_bot_duong','chat_beo','natri'])('does not add unknown %s as zero',key=>{
  expect(canAddNutritionProfile(totals,goals,{...profile,[key]:null})).toBe(false);
});

it('rejects a candidate with unknown fiber even though fiber has no upper limit',()=>{
  expect(canAddNutritionProfile(totals,goals,{...profile,chat_xo:null})).toBe(false);
});

it('rejects worsening an already exceeded nutrient even if others are deficient',()=>{
  expect(canAddNutritionProfile({...totals,chat_beo:90},goals,profile)).toBe(false);
  expect(canAddNutritionProfile({...totals,chat_beo:90},goals,{...profile,chat_beo:0})).toBe(true);
});

it('shares warning thresholds and does not penalize fiber as an upper limit',()=>{
  const addition={...profile,natri:200,chat_xo:100};
  expect(canAddNutritionProfile(totals,goals,addition)).toBe(true);
  expect(exceedsNutritionTarget('natri',totals.natri+addition.natri,goals.natri)).toBe(false);
  expect(exceedsNutritionTarget('natri',2000.1,2000)).toBe(true);
  expect(exceedsNutritionTarget('chat_beo',73.5,70)).toBe(false);
  expect(exceedsNutritionTarget('chat_beo',73.6,70)).toBe(true);
});
