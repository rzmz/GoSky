#include "mapper.h"
#include "image_opener.h"
map pixel_map;
#include "stdio.h"
#include "stdlib.h"
/**
 * Antud funktsioon genereerib vastava suurusega väljund failile mapi. Map koosneb punktidest, kus iga väljund pildi
 * aadressile vastav punkt viitab sisendpildi plikslile, mis on vaja ümber tõsta. pixel_map.map on kukul map[y][x]
 * */

void create_map(int W, int H){
	int y,x;
	pixel_map.H=H;
	pixel_map.W=W;


	pixel_map.map = (point**)malloc(sizeof(point*)*H);			//Tellin mälu mapi kõrguse jaoks (Y koord.)

	for(y=0; y<H;y++){
		pixel_map.map[y] = (point*)malloc(sizeof(point)*W);		//Tellin mälu mapi ühe rea jaoks (x koord.)
		for(x=0;x<W;x++){
			point p=P2(x,y);										//Leian vaste sisendpildil väljundi x ja y koordinaadile
			pixel_map.map[y][x].x=p.x;							//Lisan mapi aadressile (x,y) punkti p, mis -> sisendpildi punktile p'
			pixel_map.map[y][x].y=p.y;
			}

		}

	return;
	}


/**
 * Antud funktsioon kasutab genereeritud mapi ja tekitab sellest pildi
 * */
void generate_image_from_map(char *fname){
	int x,y;
	int H=pixel_map.H;
	int W=pixel_map.W;
/*
	create_img(W,H);

	for(y=0;y<H;y++){
	     for(x=0;x<W;x++){
		   point p=pixel_map.map[y][x];
		   set_pixel(x,y, get_pixel(p.x, p.y));
	     }
		}
	save_img(fname);*/
	return;
	}
