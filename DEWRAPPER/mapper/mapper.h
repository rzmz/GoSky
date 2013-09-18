#ifndef _MAPPER_H_
#define _MAPPER_H_

typedef struct		_point
	{
	unsigned int	x;
	unsigned int	y;
	}					point;

typedef struct _map
	{
	int H;
 	int W;
	point **map;
	}		map;



point P(int x, int y);
point P2(int x, int y);

void create_map(int W, int H);
void generate_image_from_map(char *fname);

#endif
