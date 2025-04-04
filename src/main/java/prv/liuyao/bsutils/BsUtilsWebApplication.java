package prv.liuyao.bsutils;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Controller
@SpringBootApplication
public class BsUtilsWebApplication {

	public static void main(String[] args) {
		SpringApplication.run(BsUtilsWebApplication.class, args);
	}

	@GetMapping("/")
	public String main(HttpServletRequest request, HttpServletResponse response){
		try {
			response.sendRedirect(request.getContextPath() + "/static/index.html");
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}

}
