#include <stdio.h>
#include <stdlib.h>
#include "mapper.h"
#include "image_opener.h"
#include "jpeglib.h"

int main(int argc, char *argv[])
{
  

  
  int H;
  int W;
  
  printf("TERE");
  printf("tere j�lle");

  //open_img("C:\\a.jpg");
  //print_opend_fail();

  create_img(10,10);
  save_img("C:\\b.jpg");

  //TEST. Hakkan lisama JPG teemat

  /*
  open_img("C:\\A2.bmp");
  H=get_H();
  W=get_W();

  create_map(1000, 1000);
  generate_image_from_map("C:\\F.bmp");
*/

  //system("PAUSE");
  return 0;
}
