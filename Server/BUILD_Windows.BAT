REM TEST.jpg

COPY jpeg_lib_makes\jconfig_win.h jpeg-9\jconfig.h /Y
COPY jpeg_lib_makes\Makefile_win jpeg-9\Makefile /Y
 

make -C jpeg-9 -f Makefile 
COPY jpeg-9\libjpeg.a fisheye2pane\image\libjpg\libjpeg.a /Y
make -C jpeg-9 clean -f Makefile 


make -f MakeWindows
make clean -f MakeWindows


fisheye2pane.exe -R 550 -x 690 -y 450 -fin "myyr.jpg" -fout "TEST.jpg" -inte 500

PAUSE

REM EEROR.txt
REM PROGRESS.txt

PAUSE
