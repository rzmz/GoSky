#include <stdlib.h>
#include <stdio.h>
#include "libbmp.h"

int			libbmp_write(char *filename, t_bmp *bmp)
{
	int		i, j;
	FILE	*fd;

	if ((fd = fopen(filename, "wb")) == NULL)
		return (0);
	fwrite(&(bmp->header.first_header.sType), sizeof(short), 1, fd);			//  0 -  1
	fwrite(&(bmp->header.first_header.iSize), sizeof(int), 1, fd);				//  2 -  5
	fwrite(&(bmp->header.first_header.sReserved1), sizeof(short), 1, fd);		//  6 -  7
	fwrite(&(bmp->header.first_header.sReserved2), sizeof(short), 1, fd);		//  8 -  9
	fwrite(&(bmp->header.first_header.iOffBits), sizeof(int), 1, fd);			// 10 - 13

	fwrite(&(bmp->header.second_header.iSize), sizeof(int), 1, fd);				// 14 - 17
	fwrite(&(bmp->header.second_header.iWidth), sizeof(int), 1, fd);			// 18 - 21
	fwrite(&(bmp->header.second_header.iHeight), sizeof(int), 1, fd);			// 22 - 25
	fwrite(&(bmp->header.second_header.sPlanes), sizeof(short), 1, fd);			// 26 - 27
	fwrite(&(bmp->header.second_header.sBitCount), sizeof(short), 1, fd);		// 28 - 29
	fwrite(&(bmp->header.second_header.iCompression), sizeof(int), 1, fd);		// 30 - 33
	fwrite(&(bmp->header.second_header.iSizeImage), sizeof(int), 1, fd);		// 34 - 37
	fwrite(&(bmp->header.second_header.iXpelsPerMeter), sizeof(int), 1, fd);	// 38 - 41
	fwrite(&(bmp->header.second_header.iYpelsPerMeter), sizeof(int), 1, fd);	// 42 - 45
	fwrite(&(bmp->header.second_header.iClrUsed), sizeof(int), 1, fd);			// 46 - 49
	fwrite(&(bmp->header.second_header.iClrImportant), sizeof(int), 1, fd);		// 50 - 53

	for (i = 0; i < bmp->height; i++)
	{
		for (j = 0; j < bmp->width; j++)
		{
			fputc(bmp->data[i][j].b, fd);
			fputc(bmp->data[i][j].g, fd);
			fputc(bmp->data[i][j].r, fd);
		}
		for (j = 0; j < bmp->width_useless; j++)
			fputc(0, fd);
	}
	fclose(fd);
	return (1);
}
