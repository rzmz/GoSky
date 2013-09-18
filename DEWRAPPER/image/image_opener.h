#ifndef _IMAGE_OPENER_H_
#define _IMAGE_OPENER_H_

#include "libbmp.h"

void open_img(char* fname);
void print_opend_fail(void);


void create_img(int W, int H);
void save_img(char * fname);


t_rgb get_pixel(int x, int y);
void set_pixel(int x, int y, t_rgb rgb);

int get_H(void);
int get_W(void);

#endif
