#include "image_opener.h"


static t_bmp fail_bmp;

/*
*Loop tühja BMP faili suuurusega WxH pixlit
*/
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

