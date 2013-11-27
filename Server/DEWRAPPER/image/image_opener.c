#include "image.h"
#include <stdio.h>
#include <stddef.h>
#include <stdlib.h>
#include "jpeglib.h"
#include "logers.h"
#include "libbmp.h"

static PIXEL **RGB_PITMAP;					//Bitmap, kuhu kirjutatakse sisse loetud JPG fail
static unsigned int H, W;					//Sisse loetud faili mõõtmed


/**
 * Antud funktsioon avab JPG formaadis faili ning salvestab selle andmed staatilisse muutujasse
 * RGB_PITMAP; Faili kohta saab lugeda järgnevat infot:
 * PIXEL get_pixel(int x, int y) - tagastab pixli OBJ vastavalt aadressilt
 * int get_H(void) - tagastab faili kõrguse
 * int get_W(void) - tagastab faili laiuse
 * */
void open_img(char* fname){
	JSAMPARRAY buffer;						//Puhver ühe rea pildi andmete jaoks
	int row_stride;							//physical row width in output buffer
	struct jpeg_decompress_struct cinfo;	//JPG OBJ faili lahti pakkimiseks
	char str_errormsg[128];
	FILE * infile;							//Faili OBJ, läbi millje JPG faili sisse loetakse
	int y, x;

	struct jpeg_error_mgr jerr;
	cinfo.err = jpeg_std_error(&jerr);
	jpeg_create_decompress(&cinfo);			//loon jpg decompress obj

	//Üritan avada jpg faili ning errori tekkimisel kirjutan selle errori logisse ja väljun.
	if (((infile = fopen(fname, "rb"))) == NULL) {
		sprintf(str_errormsg, "can't open %s\n", fname);
		write_error_log(str_errormsg);
		exit(1);
		}
	jpeg_stdio_src(&cinfo, infile);			//annan faili edasi decompress obj
	jpeg_read_header(&cinfo, TRUE);			//loen decompress obj sisse faili headeri

	jpeg_start_decompress(&cinfo);			//Faili lahti pakkimine
											//Leian reaalse sisse loetud faili rea pikkuse
	row_stride = cinfo.output_width * cinfo.output_components;
	buffer = (*cinfo.mem->alloc_sarray) ((j_common_ptr) &cinfo, JPOOL_IMAGE, row_stride, 1);
	H=cinfo.image_height;
	W=cinfo.image_width;
	//printf("h%i, w%i \n", H,W);
	//printf("Rea pikkus %i\n", row_stride);

	//Mälu tellimine ridade pointerite jaoks
	//[0]->null
	//...
	//[n]->null
	RGB_PITMAP = (PIXEL**)malloc(H * sizeof(PIXEL*));		//ülevalt alla
	//Kui tekib viga, siis kirjutan selle raportisse ja väljun
	if (RGB_PITMAP==NULL) {
		sprintf(str_errormsg, "Not enough memory for %i byte field!\n", H * sizeof(PIXEL*));
		write_error_log(str_errormsg);
		exit(1);
		}
	//int i=0;
	while (cinfo.output_scanline < cinfo.output_height){
		//Mälu tellimine ridade jaoks
		//[0]->[][][][]....[m]
		//...
		//[n]->null
		for (y = 0; y < H; y++){
			jpeg_read_scanlines(&cinfo, buffer, 1);					//loen ühe rea failist mällu
			RGB_PITMAP[y] = (PIXEL*)malloc(W * sizeof(PIXEL));	//ridade täitmine
			//Kui tekib viga, siis kirjutan selle raportisse ja väljun.
			if (!(RGB_PITMAP[y])){
				 sprintf(str_errormsg, "Not enough memory for %i byte field!\n", W * sizeof(PIXEL));
				 write_error_log(str_errormsg);
				 exit(1);
			 	 }

			for (x = 0; x < W; x++){
				RGB_PITMAP[y][x].r = buffer[0][3*x];
				RGB_PITMAP[y][x].g = buffer[0][3*x+1];
				RGB_PITMAP[y][x].b = buffer[0][3*x+2];;

				}
			}

		//printf("[%i,%i,%i]\n", buffer[0][0], buffer[0][1], buffer[0][2]);
		}
	jpeg_finish_decompress(&cinfo);		//Vabastab vajaliku mälu
	return;
}

/**
 * Antud funktsioon tagastab sisse loetud pildilt pixli OBJ ette antud aadressilt x jay.
 * Kui aadress on piiridest väljas, kirjutatakse maksimaalse aadressiga pixel väljundisse
 * */
PIXEL get_pixel(int x, int y){
	if((y<H) && (x<W))
		return RGB_PITMAP[y][x];
	else
		return RGB_PITMAP[H-1][W-1];
	}

/**
 * ANtud funktsioon tagastab sisse loetud pildi kõrguse
 */
int get_H(void){
	return H;
	}

/**
 * ANtud funktsioon tagastab sisse loetud pildi laiuse
 */
int get_W(void){
	return W;
	}

/**
 * Debuger func.
 * */
void print_opend_fail(void){
	unsigned int y, x;
	for (y = 0; y < H; y++){
		for (x = 0; x < W; x++){
			if(RGB_PITMAP[y][x].g>100) printf(".");
			else printf(" ");
			//printf("[%3i]", RGB_PITMAP[y][x].g);

			}
		printf("\n");
		}
	return;
	}


/*
 BMP KOODI JÄÄNUS ALGSEL TESTIMISEL
static t_bmp fail_bmp;


//Antud funktsioon avab pildi antud aadressilt ning paneb info staatilisse muutujasse
//fail_bmp

void open_img(char* fname){
	 libbmp_load(fname, &fail_bmp);
	 print_opend_fail();
	 return;
	 }

//Tagastab avatud pildist antud aadressilt piksli	 
t_rgb get_pixel(int x, int y){
	 return fail_bmp.data[y][x];
	 }	
//Tagastab avatud pildi kõrguse	 
int get_H(void){
	return fail_bmp.height;
	}
//Tagastab avatud pildi laiuse	
int get_W(void){
	return fail_bmp.width;
	}

//Debugimise funktsioonid

void print_opend_fail(void){
	 printf("BMP Fail\n"); 	 
	 printf("W: %i \n", fail_bmp.width);
 	 printf("H: %i \n", fail_bmp.height);
 	 printf("Wuseless: %i \n", fail_bmp.width_useless);
  	 printf("BMP Header1\n"); 	 
 	 printf("sType: %i \n", fail_bmp.header.first_header.sType);
	 printf("iSize: %i \n", fail_bmp.header.first_header.iSize);
	 printf("sReserved1: %i \n", fail_bmp.header.first_header.sReserved1);
  	 printf("sReserved2: %i \n", fail_bmp.header.first_header.sReserved2);
	 printf("iOffBits: %i \n", fail_bmp.header.first_header.iOffBits);
  	 printf("BMP Header2\n"); 	 	  
	 printf("iSize: %i \n", fail_bmp.header.second_header.iSize); 	 
	 printf("iWidth: %i \n", fail_bmp.header.second_header.iWidth);
	 printf("iHeight: %i \n", fail_bmp.header.second_header.iHeight);
	 printf("sPlanes: %i \n", fail_bmp.header.second_header.sPlanes);
	 printf("sBitCount: %i \n", fail_bmp.header.second_header.sBitCount);
	 printf("iCompression: %i \n", fail_bmp.header.second_header.iCompression);
	 printf("iSizeImage: %i \n", fail_bmp.header.second_header.iSizeImage);
	 printf("iXpelsPerMeter: %i \n", fail_bmp.header.second_header.iXpelsPerMeter);
	 printf("iYpelsPerMeter: %i \n", fail_bmp.header.second_header.iYpelsPerMeter);
	 printf("iClrUsed: %i \n", fail_bmp.header.second_header.iClrUsed);
	 printf("iClrImportant: %i \n", fail_bmp.header.second_header.iClrImportant);

 
	 return;
	 }
*/
