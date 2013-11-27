#include <stdio.h>
#include <math.h>
#include <stdlib.h>
#include "mapper.h"
#include "logers.h"

//720x623

#define x_limit 719
#define y_limit 622

	//Originaalpildi informatsioon
static	int H_D=717;	//originaalpildi (distorted) kõrgus
static	int W_D=717;	//originaalpildi (distorted)laius
static	int R_eye=350;	//kalasilma raadius pixlites
static  int C_Dx;	//Kalasilma tsenter (distorted)
static  int C_Dy;	//Kalasilma tsenter (distorted)
//Loodava pildi ja seda seovad informatsioonid
static int H_U=1000;		//loodava pildi suurus (undistorted)
static int W_U=1000;		//loodava pildi suurus (undistorted)
static int C_Ux;			//Loodava pildi tsenter	(undistorted)
static int C_Uy;			//Loodava pildi tsenter (undistorted)
static double f_D;			//Distorted pildi väändumisfaktor
static double f_U;			//UnDistorted pildi väändumisfaktor


static int R_D(int R_U){
	double B=atan((double)(R_U)/(f_U));
	double C=sin(B/2.0);
	double A=2.0*f_D*C;
	return (int)A;
	}

static int R_U(int R_D){
	double B=asin((double)(R_D)/(2.0*f_D));
	double C=tan(2.0*B);
	double A=f_U*C;
	return (int)A;
	}



/*
*Antud funktsioon võtab loodava pildi x ja y koordinaadid, ning tagastab
*moonutatud pildil olevale pixlile, kust saaks info ümber tõsta
*/
point P(int x, int y){
	  point p;
	  p.x=x_limit-x;
	  p.y=y_limit-y;
	  return p;
	  }



/**
 * Funktsiooni P(x,y) viitab moonutatud pildid punktidele, kus
 * x ja y on loodava pildi koordinaadid ning P on punkt moonutatud pildil. Vajab enne tööd
 * funktsiooniga void DWPA_set_parameters2(int w, int h, int x, int y, int r, double area)
 * initaliseerimist!
 * */
point P2(int x, int y){
	point PP;

	//Pildi kohavektori pikkus pildil U

	int ux=x-C_Ux;	//punktid pildi U keskpunkti koordinaatsüsteemis
	int uy=y-C_Uy;	//punktid pildi U keskpunkti koordinaatsüsteemis
	double r_u = sqrt(ux*ux + uy*uy);

	//Kohavektori tõusunurga sinus ja cos
	double cos_theta =(double)ux/r_u;
	double sin_theta =(double)uy/r_u;

	//Punkti kohavektori pikkus pildil D keskse koordinaatsüsteemi suhtes.

	double r_d = R_D(r_u);


	int P1x = r_d*cos_theta+C_Dx;
	int P1y = r_d*sin_theta+C_Dy;

	if(P1x >= W_D) {P1x=W_D-1;}
	if(P1x < 0){ P1x=0;}
	if(P1y >= H_D){ P1y=H_D-1;}
	if(P1y < 0) {P1y=0;}


	PP.x=P1x;
	PP.y=P1y;
	return PP;
	}




/**
 * Antud funktsion initaliseerib DewrapAlgo punktide mappimise funktsiooni P(x,y), kus
 * x ja y on loodava pildi koordinaadid ning P on punkt moonutatud pildil.
 * w, h - originaalpildi laius, kõrgus
 * x, y - originaalpildi kalasilma keskpunkt (ülevalt vasakust nurgast (0,0))
 * 		  kui x==y==0 võetakse keskpunkt originaalpildi keskele.
 * r - originaalpildi kalasilma raadius
 * f - venitus faktor. Peab olema vähemalt > 0.9*r. Mida lähemal 0.9*r seda suurem venitus äärtes.
 * */
void DWPA_set_parameters(int w, int h, int x, int y, int r, int f){
	R_eye=r;
	W_D=w;
	H_D=h;
	if((x==0) || (y==0)){	//Arvutame keskpunktiks originaalpildi keskpunkti
		C_Dx = W_D/2;
		C_Dy = H_D/2;
		}
	else{
		C_Dx=x;
		C_Dy=y;
		}

	if((C_Dx>=W_D) || (C_Dx<0) || (C_Dy>=H_D) || (C_Dy<0)){
		write_error_log("DWPA_center parameters out of range");
		exit(0);
		}
	
	if(R_eye == 0){
		R_eye=H_D/2;			
		}


	f_U=f;
	if(f_U<R_eye*0.9) f_U=R_eye*0.9;
	if(f==0) f_U=R_eye*0.90;


	f_D=f_U;
	int R_Umax=R_U(R_eye);
	H_U=W_U=1.41421*(double)R_Umax;
	C_Ux=C_Uy=H_U/2;

	return;
}

/**
 * Tagastab loodava pildi mõõtmed. Loodav pilt on ruudkujuline. Enne selle väljakutset peab olema
 * välja kutsutud funktsioon void DWPA_set_parameters(int w, int h, int x, int y, int r, double area);
 * */
int DWPA_get_img_size(void){
	return H_U;
	}


















 /**
 * Antud funktsion initaliseerib DewrapAlgo punktide mappimise funktsiooni P(x,y), kus
 * x ja y on loodava pildi koordinaadid ning P on punkt moonutatud pildil.
 * w, h - originaalpildi laius, kõrgus
 * x, y - originaalpildi kalasilma keskpunkt (ülevalt vasakust nurgast (0,0))
 * 		  kui x==y==0 võetakse keskpunkt originaalpildi keskele.
 * r - originaalpildi kalasilma raadius
 * */
/**
void DWPA_set_parameters3(int w, int h, int x, int y, int r, double area){
	R_eye=(int)((double)r*area);
	W_D=w;
	H_D=h;
	if(x==y==0){	//Arvutame keskpunktiks originaalpildi keskpunkti
		C_Dx = W_D/2;
		C_Dy = H_D/2;
		}
	else{
		C_Dx=x;
		C_Dy=y;
		}

	H_U=W_U=(unsigned int)((double)r*M_PI*((double)(R_eye)/(double)(r)))*0.7;

	return;
}






*/




/**
 * Funktsiooni P(x,y) viitab moonutatud pildid punktidele, kus
 * x ja y on loodava pildi koordinaadid ning P on punkt moonutatud pildil. Vajab enne tööd
 * funktsiooniga void DWPA_set_parameters3(int w, int h, int x, int y, int r, double area)
 * initaliseerimist!
 * */

/*
point P3(int x, int y){
	point PP;

	//loodava pildi keskse koordinaatsüsteemi kohavektor
	double a=y-(double)(H_U/2);
	double b=x-(double)(W_U/2);
	//a ja b pikkus
	double _P_ = sqrt(a*a + b*b);
	double _D_ = sqrt(H_U*H_U + W_U*W_U)/2.0;

	double cos_ax = (b)/(_P_);
	double sin_ax = (a)/(_P_);
	double cos_az = cos((M_PI*_P_)/(2.0*_D_));
	double sin_az = sin((M_PI*_P_)/(2.0*_D_));

	int P1x = R_eye*sin_az*cos_ax + C_Dx;
	int P1y = R_eye*sin_az*sin_ax + C_Dy;

	if(P1x >= W_D) {P1x=W_D-1; printf("errror1");}
	if(P1x < 0){ P1x=0; printf("errror2");}
	if(P1y >= H_D){ P1y=H_D-1; printf("errror3");}
	if(P1y < 0) {P1y=0; printf("errror4");}


	PP.x=P1x;
	PP.y=P1y;
	return PP;
	}


 */




