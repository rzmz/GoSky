/*
 * logers.h
 *
 *  Created on: 28.09.2013
 *      Author: xp
 */

#ifndef LOGERS_H_
#define LOGERS_H_

void init_error_log(char *fname);
void write_error_log(char *msg);
void close_error_log(void);

void init_progress_log(char *fname);
void write_progress_log(char *msg);
void close_progress_log(void);

#endif /* LOGERS_H_ */
