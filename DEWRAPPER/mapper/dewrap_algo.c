#include "mapper.h"
#include "math.h"
#include "stdio.h"
//720x623

#define x_limit 719
#define y_limit 622


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


point P2(int x, int y){
	point PP;
	//Originaalpildi informatsioon
	int H_or=717;	//originaalpildi kõrgus
	int W_or=717;	//originaalpildi laius
	int R_or=350;	//kalasilma raadius pixlites

	int x_tsenter = W_or/2;
	int y_tsenter = H_or/2;

	//Loodava pildi ja seda seovad informatsioonid
	int H=1000;		//loodava pildi suurus
	int W=1000;		//loodava pildi suurus

	//loodava pildi keskse koordinaatsüsteemi kohavektor
	double a=y-(double)(H/2);
	double b=x-(double)(W/2);
	//a ja b pikkus
	double _P_ = sqrt(a*a + b*b);
	double _D_ = sqrt(H*H + W*W)/2.0;

	double cos_ax = (b)/(_P_);
	double sin_ax = (a)/(_P_);
	double cos_az = cos((M_PI*_P_)/(2.0*_D_));
	double sin_az = sin((M_PI*_P_)/(2.0*_D_));

	int P1x = R_or*sin_az*cos_ax + x_tsenter;
	int P1y = R_or*sin_az*sin_ax + y_tsenter;

	if(P1x >= W_or) {P1x=W_or-1; printf("errror1");}
	if(P1x < 0){ P1x=0; printf("errror2");}
	if(P1y >= H_or){ P1y=H_or-1; printf("errror3");}
	if(P1y < 0) {P1y=0; printf("errror4");}


	PP.x=P1x;
	PP.y=P1y;
	return PP;
	}
