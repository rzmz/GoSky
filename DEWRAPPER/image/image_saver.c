#include "image.h"
#include <stdio.h>
#include <stddef.h>
#include <stdlib.h>
#include "jpeglib.h"
#include "logers.h"

static PIXEL **RGB_PITMAP;			//Väljundfaili pitiväli
static unsigned int W=0;			//Väljundfaili laius
static unsigned int H=0;			//Väljundfaili kõrgus
static unsigned int quality=50;		//Väljundfaili kvaliteedinäitaja 0..25


/**
 * Antud funktsioon võtab parameetriteks w-pildi laius ja h-pildi kõrgus ning tellib selle jaoks
 * mälu ning moodustab bitmapi. Bitmapi pixleid, saab muuta funktsiooniga
 * void set_pixel(int x, int y, PIXEL rgb); Bitmapi saab salvestada JPG formaadiks, funktsiooniga
 * void save_img(char * fname)
 *  * */
void create_img(int w, int h){
	int y,x;
	char str_errormsg[128];
	W=w;			//Seadistan staatiliste muutujate väärtused sellisteks nagu loodav pilt tuleb
	H=h;


	//Tellin mälu ridade pointeritele
	//[0]->null
	//...
	//[n]->null
	RGB_PITMAP = (PIXEL**)malloc(H * sizeof(PIXEL*));		//ülevalt alla
	if (RGB_PITMAP==NULL) {
		sprintf(str_errormsg, "Not enough memory for %i byte field!\n", H * sizeof(PIXEL*));
		write_error_log(str_errormsg);
		exit(1);
		}

	for (y = 0; y < H; y++){
		//Tellin mälu ridadele
		//[0]->[][][]...[]
		//...
		//[n]->null
		RGB_PITMAP[y] = (PIXEL*)malloc(W * sizeof(PIXEL));	//ridade täitmine
		if (!(RGB_PITMAP[y])){
			 sprintf(str_errormsg, "Not enough memory for %i byte field!\n", W * sizeof(PIXEL));
			 write_error_log(str_errormsg);
			 exit(1);
		 	 }
		//Kui rida on tellitud, siis initaliseerin seal olevate pikslite väärtused.
		 for (x = 0; x < W; x++){
			 RGB_PITMAP[y][x].b = 255;
			 RGB_PITMAP[y][x].g = 255;
			 RGB_PITMAP[y][x].r = 255;
			 }
		}
	return;
	}



/**
 * Antud funktsioon salvestab parameetriga fname viidatud asukohale jpg formaadis faili, mille sisu
 * on toodud staatilises muutujas RGB_PITMAP; Pildi mõõtmeteks tuleb WxH, mis määrati funktsiooniga
 * void create_img(int w, int h); Pildi andmeid saab muuta funktsiooniga
 * void set_pixel(int x, int y, PIXEL rgb) Pildi kvaliteeti saab muuta funktsiooniga
 * void set_quality(int q);
 * */
void save_img(char * fname){
	char str_errormsg[128];					//Puhver veateadete jaoks
	struct jpeg_compress_struct cinfo;		//JPG kompressori OBJ
	struct jpeg_error_mgr jerr;				//JPG error
	FILE * outfile;							//Fail
	JSAMPROW row_pointer[0];					//Rea andmete pointer
	int row_stride;							//Andmerea maht baitides
	//Määratakse JPG OBJ errori asjandus
	cinfo.err = jpeg_std_error(&jerr);
	jpeg_create_compress(&cinfo);
	//Luuakse FAIL OBJ binary kirjutamiseks, errori puhul väljutakse ja salvestatakse veateade
	 if ((outfile = fopen(fname, "wb")) == NULL) {
	    sprintf(str_errormsg, "can't open for write %s\n", fname);
	    write_error_log(str_errormsg);
	    exit(1);
	    }
	jpeg_stdio_dest(&cinfo, outfile);		//Antakse FAIL OBJ edasi kompressor OBJ'ektile

	cinfo.image_width = W; 					//Pildi mõõtmed, mis väljundisse tulevad
	cinfo.image_height = H;
	cinfo.input_components = 3;				//Värvi komponentide hulk -RGB
	cinfo.in_color_space = JCS_RGB; 		//RGB tüüpi sisend kompressor OBJ

	jpeg_set_defaults(&cinfo);				//Teised väärtused defauldiks
	jpeg_set_quality(&cinfo, quality, TRUE );

	jpeg_start_compress(&cinfo, TRUE);		//Alustatkse JPG kompressimist

	row_stride = W * 3;						//Arvutatakse, mitu baiti kulub ühe rea jaoks

	while (cinfo.next_scanline < cinfo.image_height) {
	    //RGB_BITMAP struktuuri bitiväljad on mälus seadistatud nii [R][G][B][R][G][B][R][G][B]
		//Sellest tulenevalt võin teha alloleva teisenduse
		row_pointer[0] = (unsigned char*)RGB_PITMAP[cinfo.next_scanline];
	    jpeg_write_scanlines(&cinfo, row_pointer, 1);
	  }


	jpeg_finish_compress(&cinfo);	//Kompressioon lõpetatud.
	fclose(outfile);
	jpeg_destroy_compress(&cinfo);	//Vabastatakse kompressori mälu
	return;
	}


/**
 * Antud funktsioon seab väljundfaili pixli väärtuse. Selleks kasutab see pixli koordinaate x ja y.
 * Muudatust ei viida sisse, kui x ja y viitavad pildi piiridest välja. Pixli väärtust kannab OBJ PIXEL.
 * */
void set_pixel(int x, int y, PIXEL rgb){
	if((y<H) && (x<W) )
		{
		RGB_PITMAP[y][x].b = rgb.b;
		RGB_PITMAP[y][x].g = rgb.g;
		RGB_PITMAP[y][x].r = rgb.r;
		}

	 return;
	 }


/**
 * Antud funktsioon seab väljundpildi kvaliteedi. Kvaliteedinäitaja on vahemikus 0-25, kus kõrgem näitaja
 * on parem kvaliteet.
 * */
void set_quality(int q){
	quality=q;
	return;
	}







/*
VANA BMP KOOD

static t_bmp fail_bmp;
//Loop tühja BMP faili suuurusega WxH pixlit

void create_img(int W, int H){
	 int y=0;
 	 int x=0;
	 int Wuseless=0;
	 if(fail_bmp.data!=0) libbmp_free(&fail_bmp);	//Kui data pointer viitab kuhugile, siis kustutan selle tühjaks
  	 
	 // Faili headeri täitmine
	 Wuseless=fail_bmp.width_useless=W%4;
	 
	 fail_bmp.width=W;
 	 fail_bmp.height=H;
	 	 
	 fail_bmp.header.first_header.sType=19778;
	 fail_bmp.header.first_header.iOffBits=54;
	 fail_bmp.header.first_header.iSize=H*W*3+54 + Wuseless*H;
	 fail_bmp.header.first_header.sReserved1=0;
	 fail_bmp.header.first_header.sReserved2=0;

	 fail_bmp.header.second_header.iSize=40;
	 fail_bmp.header.second_header.iWidth=W;
	 fail_bmp.header.second_header.iHeight=H;
	 fail_bmp.header.second_header.sPlanes=1;
	 fail_bmp.header.second_header.sBitCount=24;
	 fail_bmp.header.second_header.iCompression=0;
	 fail_bmp.header.second_header.iSizeImage=H*W*3+Wuseless*H;
	 fail_bmp.header.second_header.iXpelsPerMeter=0;
	 fail_bmp.header.second_header.iYpelsPerMeter=0;
	 fail_bmp.header.second_header.iClrUsed=0;
	 fail_bmp.header.second_header.iClrImportant=0;
	 
	 //Faili dataosa täitmine
	 
	fail_bmp.data = (t_rgb**)malloc(H * sizeof(t_rgb*));		//ülevalt alla
	if (!(fail_bmp.data))printf("error1");
	 
	for (y = 0; y < H; y++){
		 fail_bmp.data[y] = (t_rgb*)malloc(W * sizeof(t_rgb));	//ridade täitmine
		 if (!(fail_bmp.data[y]))printf("error2");
		 
		 for (x = 0; x < W; x++){
		 	 fail_bmp.data[y][x].b = 0;
			 fail_bmp.data[y][x].g = 0;
			 fail_bmp.data[y][x].r = 0;
			 fail_bmp.data[y][x].moy = 0;
			 }
		 }
	 return;
	 }

//Salvestab antud nimega faili kettale	 
void save_img(char * fname){
	 libbmp_write(fname, &fail_bmp);
	 return;
	 }

//Seab antud aadressile piksli
void set_pixel(int x, int y, t_rgb rgb){
	 if((y<fail_bmp.height) && (x<fail_bmp.width) )
		{
	 	fail_bmp.data[y][x].b = rgb.b;
	 	fail_bmp.data[y][x].g = rgb.g;
	 	fail_bmp.data[y][x].r = rgb.r;
		}
	 return;
	 }

*/
