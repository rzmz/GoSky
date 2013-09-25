#include <stdlib.h>
#include "libbmp.h"

int		libbmp_free(t_bmp *bmp)
{
	int		i;
	int		k;

	k = bmp->width + bmp->width_useless;
	for (i = 0; i < k; i++)
		free(bmp->data[i]);
	free(bmp->data);
	return (1);
}
