#include "image_opener.h"
#include <stdio.h>

static t_bmp fail_bmp;

/*
*Antud funktsioon avab pildi antud aadressilt ning paneb info staatilisse muutujasse
fail_bmp
*/
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
