#include <stdlib.h>
#include <stdio.h>
#include "libbmp.h"


int			libbmp_load(char *filename, t_bmp *bmp)
{
	int		i, j;
	FILE	*fd;

	if ((fd = fopen(filename, "rb")) == NULL)
		return (0);
	fread(&(bmp->header.first_header.sType), sizeof(short), 1, fd);				//  0 -  1
	fread(&(bmp->header.first_header.iSize), sizeof(int), 1, fd);				//  2 -  5
	fread(&(bmp->header.first_header.sReserved1), sizeof(short), 1, fd);		//  6 -  7
	fread(&(bmp->header.first_header.sReserved2), sizeof(short), 1, fd);		//  8 -  9
	fread(&(bmp->header.first_header.iOffBits), sizeof(int), 1, fd);			// 10 - 13

	fread(&(bmp->header.second_header.iSize), sizeof(int), 1, fd);				// 14 - 17
	fread(&(bmp->header.second_header.iWidth), sizeof(int), 1, fd);				// 18 - 21
	fread(&(bmp->header.second_header.iHeight), sizeof(int), 1, fd);			// 22 - 25
	fread(&(bmp->header.second_header.sPlanes), sizeof(short), 1, fd);			// 26 - 27
	fread(&(bmp->header.second_header.sBitCount), sizeof(short), 1, fd);		// 28 - 29
	fread(&(bmp->header.second_header.iCompression), sizeof(int), 1, fd);		// 30 - 33
	fread(&(bmp->header.second_header.iSizeImage), sizeof(int), 1, fd);			// 34 - 37
	fread(&(bmp->header.second_header.iXpelsPerMeter), sizeof(int), 1, fd);		// 38 - 41
	fread(&(bmp->header.second_header.iYpelsPerMeter), sizeof(int), 1, fd);		// 42 - 45
	fread(&(bmp->header.second_header.iClrUsed), sizeof(int), 1, fd);			// 46 - 49
	fread(&(bmp->header.second_header.iClrImportant), sizeof(int), 1, fd);		// 50 - 53

	bmp->width = bmp->header.second_header.iWidth;
	bmp->height = bmp->header.second_header.iHeight;
	bmp->width_useless = bmp->width % 4;
	bmp->data = (t_rgb**)malloc(bmp->height * sizeof(t_rgb*));
	if (!(bmp->data))
		return (0);
	for (i = 0; i < bmp->height; i++)
	{
		bmp->data[i] = (t_rgb*)malloc(bmp->width * sizeof(t_rgb));
		if (!(bmp->data[i]))
			return (0);
		for (j = 0; j < bmp->width; j++)
		{
			bmp->data[i][j].b = (unsigned char)fgetc(fd);
			bmp->data[i][j].g = (unsigned char)fgetc(fd);
			bmp->data[i][j].r = (unsigned char)fgetc(fd);
			bmp->data[i][j].moy = (unsigned char)((bmp->data[i][j].r + bmp->data[i][j].g + bmp->data[i][j].b) / 3);
		}
		for (j = 0; j < bmp->width_useless; j++)
			fgetc(fd);
	}
	fclose(fd);
	return (1);
}

/*fread - võtab struktuurist jupi aadressi
, leiab vastava andmetüüpi pikkuse baitides
, mittu sellist tükki lugeda
, kust lugeda.

Nõnda täidetakse struktuuri t_bmp *bmp, sees oleva
struktuuri header struktuuri sisu vastava BMP headeri infoga
Lõpuks leitud andmetest pannakse struktuuri t_bmp *bmp kirja
pildi pikkus ja laius.

Järgmisena tellitakse mälu:
bmp->data = (t_rgb**)malloc(bmp->height * sizeof(t_rgb*));

typedef struct		s_rgb
{
	unsigned char	r;
	unsigned char	g;
	unsigned char	b;
	unsigned char	moy;

}					t_rgb;

tekitatakse massiiv, mis viitab seda tüüpi struktuuride viitadele

bmp->data[i] = (t_rgb*)malloc(bmp->width * sizeof(t_rgb));
siis võetakse ja defineeritakse igale reale vastav kogus mälu
, et sinna panna struktuurid

data[i-kõrgus y][j - laius x]
*/
