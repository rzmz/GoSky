1) Pilditöötlus algoritm fisheye2pano ja label

Pilditöötlus on läbi viidud [ImageMagick](http://www.imagemagick.org/script/index.php) tööriistadega. ImageMagick tööriistadega on kirjutatud kaks skripti:

2) label skript

Antud skript lisab pildile alla paremasse nurka sõne (datestring parameeter) ning pildi keskele alla tähe N, mis tähistab põhjasuunda. Skripti kasutamine on järgmine:

label fin fout datestring
fin - sisendfail,  
fout - väljundfail,
datestring - sõne, mis kirjutatakse alla paremasse nurka.

3) fisheye2pano skript

Antud skript võtab kalasilm-objektiiviga tehtud foto ning "keerab" selle lahti panoraamiks. Skriptile saab ette anda põhja suuna nurga **kraadides**, mille tulemusel nihutatakse panoraami nii, et põhja suund jääb täpselt panoraami keskele. Nurka mõõdetakse x-telje suhtes ning näit on kellaosuti vastu liikudes positiivne. Pilt, millele skripti rakendatakse, peab olema seadistatud nii, et kalasilma kujutise tsenter jääb pildi keskele ja serv on pildi ülemise ääre vastas. Skript võtab pildi nimest kuupäeva, kui see on kujul IMG_yyyymmdd_hhmmss.jpg , ning edastab selle edasi skriptile label, mis asetab põhja suuna ja kuupäeva. Kui kuupäeva ei õnnestu lugeda, pannakse masina hetkeline kuupäev ja kellaaeg. Skripti kasutamine on järgmine:

fisheye2pano north fin fout
north** - põhjasunna nurk x-telje suhtes,  
fin - sisendfail,  
fout - väljundfail,
-help - trükib abiteksti.
