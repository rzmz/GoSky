#include <stdio.h>
#include <stdlib.h>
#include "mapper.h"
#include "image_opener.h"

int main(int argc, char *argv[])
{
  

  
  int H;
  int W;
  
  open_img("C:\\A2.bmp");
  H=get_H();
  W=get_W();

  create_map(1000, 1000);
  generate_image_from_map("C:\\F.bmp");


  //system("PAUSE");
  return 0;
}
