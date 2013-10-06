#ifndef _IMAGE_H_
#define _IMAGE_H_

//#include "libbmp.h"


typedef struct		_pix
{
	unsigned char	r;
	unsigned char	g;
	unsigned char	b;

}					PIXEL;




void open_img(char* fname);
void print_opend_fail(void);


void create_img(int W, int H);
void save_img(char * fname);


PIXEL get_pixel(int x, int y);
void set_pixel(int x, int y, PIXEL rgb);

int get_H(void);
int get_W(void);

#endif
