#ifndef _LIBBMP_H_
#define _LIBBMP_H_


#define		LIBBMP_VERSION		0.2


typedef struct		s_rgb
{
	unsigned char	r;
	unsigned char	g;
	unsigned char	b;
	unsigned char	moy;

}					t_rgb;


typedef	struct	s_bmp_fh
{
	short		sType;				// Deux caractères B et M
	int			iSize;				// Taille total du fichier
	short		sReserved1;			// 0
	short		sReserved2;			// 0
	int			iOffBits;			// Offset des bits du bitmap dans le fichier

}				t_bmp_fh;


typedef	struct	s_bmp_sh
{
	int			iSize;				// Taille de cette structure en octets
	int			iWidth;				// Largeur du bitmap en pixel
	int			iHeight;			// Hauteur du bitmap en pixel
	short		sPlanes;			// 1
	short		sBitCount;			// Bits couleurs par pixel
	int			iCompression;		// Schéma de compactage (0 pour aucun)
	int			iSizeImage;			// Taille de l’image en octets (utile pour le compactage)
	int			iXpelsPerMeter;		// Résolution horizontale en pixels par mètre
	int			iYpelsPerMeter;		// Résolution verticale en pixels par mètre
	int			iClrUsed;			// Nombre de couleurs utilisées dans l’image
	int			iClrImportant;		// Nombre de couleurs importantes

}				t_bmp_sh;


typedef	struct	s_bmp_header
{
	t_bmp_fh	first_header;
	t_bmp_sh	second_header;

}				t_bmp_header;


typedef struct		s_bmp
{
	t_bmp_header	header;
	int				width;
	int				width_useless;
	int				height;
	t_rgb			**data;

}					t_bmp;



int		libbmp_load(char *filename, t_bmp *bmp);
int		libbmp_write(char *filename, t_bmp *bmp);
int		libbmp_free(t_bmp *bmp);

#endif
