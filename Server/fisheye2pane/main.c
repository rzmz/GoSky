#include <stdio.h>
#include <stdlib.h>
#include "mapper.h"
#include <string.h>
#include "image.h"
#include "jpeglib.h"
#include "logers.h"

void HELP(void);

int main(int argc, char *argv[])
{

  int H,i;
  
  int para_R=0;
  int para_x=0;
  int para_y=0;
  int para_inte=0;
  char *fin=0;
  char *fout=0;
  char show_help=0;
  int isLoggingEnabled=0;

//Argumentide otsimine
  for(i=0; i<argc;i++){
	  if((strcmp(argv[i], "-R")==0) && ((i+1)<argc)){
  		  para_R=atoi(argv[i+1]);
  	  	  }
  	  else if((strcmp(argv[i], "-x")==0) && ((i+1)<argc)){
  		  para_x=atoi(argv[i+1]);
  	  	  }
  	  else if((strcmp(argv[i], "-y")==0) && ((i+1)<argc)){
  		  para_y=atoi(argv[i+1]);
  	  	  }
  	  else if((strcmp(argv[i], "-fin")==0) && ((i+1)<argc)){
  		fin=argv[i+1];
  	  	  }
  	  else if((strcmp(argv[i], "-fout")==0) && ((i+1)<argc)){
  		fout=argv[i+1];
  	  	  }
  	  else if((strcmp(argv[i], "-inte")==0) && ((i+1)<argc)){
  		para_inte=atoi(argv[i+1]);
  	  	  	  }
  	  else if((strcmp(argv[i], "-help")==0)){
  		show_help=1;
  	  	  }
  	  else if((strcmp(argv[i], "-log")==0)){
  		isLoggingEnabled=1;
  	  	  }
  	  else{
  		  //printf("Unknown parameter or missing argument: %s", argv[i]);
  	  	  }
  	  }

//Kui mıni argumentidest on olnud help, siis tr¸ki see ja v‰lju.
  if(show_help==1){
	  HELP();
	  return 0;
  	  }


//Kui Logimine on lubatud, siis tekitan logimise failid
  if(isLoggingEnabled){
  	init_error_log("ERROR.txt");
  	init_progress_log("PROGRESS.txt");
	}


/*
  printf("R %i\n", para_R);
  printf("x %i\n", para_x);
  printf("y %i\n", para_y);
  printf("intensity %i\n", para_inte);
  printf("Fin %s\n", fin);
  printf("Fout %s\n", fout);
*/

//P‰ris programm

  open_img(fin);
  
  //Antud funktsiooni sees toimub parameetrite korrigeerimine 
  DWPA_set_parameters(get_W(), get_H(), para_x, para_y, para_R, para_inte);
  //DWPA_set_parameters(get_W(), get_H(), para_R, 1 );
  H=DWPA_get_img_size();
  create_map(H, H);
  generate_image_from_map(fout);

  char str_msg[1024];
  sprintf(str_msg, "%s -> %s\n", fin, fout);
  write_progress_log(str_msg);

  close_error_log();
  close_progress_log();
  return 0;
}




void HELP(void){
	printf("-R \t kalasilma raadius pixlites. Kui on 0 saab default v‰‰rtuseks 0.5*fin kırgus.\n");
	printf("-x, -y \t kalasilma tsenter. Kui on 0, siis asub pildi tsentris.\n");
	printf("-inte \t intensiivsus, mil m‰‰ral pilti v‰‰natakse. Minimaalne v‰‰rtus 0.9*R. Mida suurem vırreldes R, seda v‰iksem venitamine.\n");
	printf("-fin \t sisend faili asukoht\n");
	printf("-fout \t v‰ljundfaili asukoht\n");
	printf("-log \t Tekitab k‰ivitamisel failid ERROR.txt ja PROGRESS.txt, kus on kirjas tekkinud vead ja konverteeritud failid.\n");
	printf("-help \t tr¸kib helpi\n");
	}

