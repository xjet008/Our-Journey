// Every connector starts at a surface edge, so neighboring decks never overlap.
export const decks={entrance:{width:7.2,depth:6.8},roses:{width:7.4,depth:6.8},grove:{width:5.2,depth:6.4},stars:{width:5.2,depth:4.8},viewpoint:{width:6.2,depth:4.4}};
export const connectors=[
 {owner:'entrance',axis:'z',start:-3.4,end:-3.6,width:4.2},
 {owner:'roses',axis:'x',start:3.7,end:5.4,width:4.2},
 {owner:'grove',axis:'z',start:-3.2,end:-5.6,width:4.2},
 {owner:'stars',axis:'z',start:-2.4,end:-3.8,width:4.2}
];
export const bench={x:-4,z:-.85,width:3.9,seatTop:.51};
